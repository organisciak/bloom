export const swapSnapshot = (current, snapshot) => {
  if (!snapshot) {
    return { current, snapshot, swapped: false };
  }
  return { current: snapshot, snapshot: current, swapped: true };
};

export const hasSnapshot = (snapshot) => typeof snapshot === 'string' && snapshot.length > 0;
