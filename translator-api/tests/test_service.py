import os
os.environ["FAKE_MODEL"] = "1"
os.environ["NLLB_SERVICE_KEY"] = "k"
os.environ["WATCHDOG_SECONDS"] = "3600"

from fastapi.testclient import TestClient
import app as svc


def client():
    c = TestClient(svc.app)
    c.__enter__()
    svc._load()
    return c


def post(c, body, key="k"):
    return c.post("/translate", json=body, headers={"x-api-key": key})


def test_health_ready_and_auth():
    c = client()
    assert c.get("/health").json() == {"status": "ok"}
    assert c.get("/ready").status_code == 200
    assert post(c, {"text": "hi", "from": "en", "to": "luo"}, key="wrong").status_code == 401
    assert post(c, {"text": "hi", "from": "en", "to": "xx"}).status_code == 400
    assert post(c, {"text": "", "from": "en", "to": "luo"}).status_code == 422
    assert post(c, {"text": "x" * 501, "from": "en", "to": "luo"}).status_code == 422


def test_pivot_rules():
    c = client()
    assert post(c, {"text": "Hello", "from": "en", "to": "luo"}).json()["text"] == "[en>luo] Hello"
    # German -> Dholuo must go through English
    assert post(c, {"text": "Hallo", "from": "de", "to": "luo"}).json()["text"] == "[en>luo] [de>en] Hallo"
    # Taita -> Dholuo pivots through English
    assert post(c, {"text": "x", "from": "dav", "to": "luo"}).json()["text"] == "[en>luo] [dav>en] x"
    # plain pair stays one hop
    assert post(c, {"text": "Hola", "from": "es", "to": "sw"}).json()["text"] == "[es>sw] Hola"


def test_queue_limit():
    c = client()
    svc.inflight = svc.MAX_QUEUE
    assert post(c, {"text": "hi", "from": "en", "to": "sw"}).status_code == 503
    svc.inflight = 0


def test_new_kenyan_languages():
    c = client()
    # Kikuyu and Kamba go through English like the other local languages
    assert post(c, {"text": "x", "from": "ki", "to": "fr"}).json()["text"] == "[en>fr] [ki>en] x"
    assert post(c, {"text": "Hello", "from": "en", "to": "kam"}).json()["text"] == "[en>kam] Hello"
    # an adapter trained on Swahili pairs translates Swahili directly
    svc.DIRECT_SW.add("kik")
    try:
        assert post(c, {"text": "x", "from": "sw", "to": "ki"}).json()["text"] == "[sw>ki] x"
    finally:
        svc.DIRECT_SW.discard("kik")
    assert post(c, {"text": "x", "from": "sw", "to": "ki"}).json()["text"] == "[en>ki] [sw>en] x"
    # without its adapter Kalenjin is refused as unsupported (400), never served as plain Dholuo
    svc.FAKE = False
    try:
        assert svc.engine.supports("ki") and svc.engine.supports("kam")
        assert not svc.engine.supports("kln")
        assert post(c, {"text": "x", "from": "en", "to": "kln"}).status_code == 400
    finally:
        svc.FAKE = True
