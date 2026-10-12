export function eligiblePlaytime({playing,visible,pageActive,overlayOpen,loaded}) {
  return !!(playing&&visible&&pageActive&&overlayOpen&&loaded);
}
