"use client";

import { Bell, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";

export function NotifyButton() {
  const [notified, setNotified] = useState(false);
  return (
    <Button className="mt-6" variant={notified ? "soft" : "dark"} onClick={() => setNotified(true)}>
      {notified ? <Check className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
      {notified ? "We'll let you know" : "Notify me at launch"}
    </Button>
  );
}
