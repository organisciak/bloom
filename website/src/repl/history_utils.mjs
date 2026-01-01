export const createHistory = (limit = 20) => {
  let items = [];

  const push = (value) => {
    if (value == null) return;
    if (items[items.length - 1] === value) return;
    items = [...items, value].slice(-limit);
  };

  const undo = () => {
    if (items.length < 2) return null;
    items = items.slice(0, -1);
    return items[items.length - 1] ?? null;
  };

  const peek = () => items[items.length - 1] ?? null;

  const size = () => items.length;

  const reset = () => {
    items = [];
  };

  return {
    push,
    undo,
    peek,
    size,
    reset,
  };
};
