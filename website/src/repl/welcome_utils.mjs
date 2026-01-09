export const buildOpenComposeHandler = (setActiveFooter, setIsPanelOpened) => () => {
  setActiveFooter('compose');
  setIsPanelOpened(true);
};
