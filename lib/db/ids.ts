/** Short, sortable-enough random ids like "p_k3j9x2ab1c". */
export const newId = (prefix = "") => `${prefix}${Date.now().toString(36).slice(-5)}${Math.random().toString(36).slice(2, 9)}`;
