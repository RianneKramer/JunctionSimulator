/**
 * Route definitions for all car traffic lights.
 *
 * Each path defines a sequence of waypoints [[x,y], ...] on the 640x640 canvas,
 * plus the indices of the detection zone start and stop line.
 *
 * To edit these visually, use the path editor at /editor.html.
 */
export const RAW_PATHS = {
  "1.1":  { points: [[640,289],[545,289],[480,288],[443,287],[395,282],[372,237],[371,160],[371,118],[371,3]],                                          stopIdx: 3, detectIdx: 2, color: '#e74c3c', desc: 'E->N' },
  "2.1":  { points: [[640,314],[553,316],[483,315],[444,315],[400,312],[351,301],[317,273],[274,257],[229,245],[149,245],[68,246],[0,246]],                stopIdx: 3, detectIdx: 2, color: '#e74c3c', desc: 'E->W' },
  "5.1":  { points: [[388,640],[386,589],[386,544],[386,511],[387,444],[388,403],[381,343],[370,283],[371,221],[370,119],[370,0]],                        stopIdx: 3, detectIdx: 2, color: '#2ecc71', desc: 'S->N' },
  "6.1":  { points: [[363,640],[362,589],[360,543],[360,511],[360,452],[358,384],[350,326],[325,283],[282,256],[217,247],[123,245],[0,246]],               stopIdx: 3, detectIdx: 2, color: '#2ecc71', desc: 'S->W' },
  "7.1":  { points: [[0,333],[85,336],[148,336],[180,336],[257,335],[314,358],[324,423],[324,517],[326,584],[328,640]],                                   stopIdx: 3, detectIdx: 2, color: '#f39c12', desc: 'W->S' },
  "8.1":  { points: [[0,307],[73,306],[143,309],[179,310],[277,317],[365,349],[459,353],[522,378],[637,382]],                                             stopIdx: 3, detectIdx: 2, color: '#f39c12', desc: 'W->E' },
  "9.1":  { points: [[0,279],[70,280],[142,282],[181,283],[241,285],[307,283],[351,271],[371,226],[373,129],[371,0]],                                     stopIdx: 3, detectIdx: 2, color: '#f39c12', desc: 'W->N' },
  "10.1": { points: [[253,0],[253,70],[254,140],[253,170],[255,206],[244,244],[209,249],[125,249],[0,248]],                                               stopIdx: 3, detectIdx: 2, color: '#3498db', desc: 'N->W' },
  "11.1": { points: [[281,0],[282,70],[281,140],[281,168],[280,250],[306,325],[324,396],[324,524],[325,640]],                                             stopIdx: 3, detectIdx: 2, color: '#3498db', desc: 'N->S' },
  "12.1": { points: [[310,0],[309,78],[310,141],[310,168],[313,241],[318,283],[350,335],[395,353],[520,353],[638,351]],                                   stopIdx: 3, detectIdx: 2, color: '#3498db', desc: 'N->E' },
};

/**
 * Non-car lights (bus, bicycle, pedestrian).
 * These use manual entity toggles instead of simulated cars.
 */
export const MANUAL_LIGHTS = {
  "42":   { desc: 'Bus E',           cat: 'bus'   },
  "22":   { desc: 'Fiets Oost',      cat: 'fiets' },
  "26.1": { desc: 'Fiets West',      cat: 'fiets' },
  "28.1": { desc: 'Fiets N-O',       cat: 'fiets' },
  "86.1": { desc: 'Fiets Z/W',       cat: 'fiets' },
  "88.1": { desc: 'Fiets West2',     cat: 'fiets' },
  "31.1": { desc: 'Voetg O Z>N 1',   cat: 'voetg' },
  "31.2": { desc: 'Voetg O Z>N 2',   cat: 'voetg' },
  "32.1": { desc: 'Voetg O N>Z 1',   cat: 'voetg' },
  "32.2": { desc: 'Voetg O N>Z 2',   cat: 'voetg' },
  "35.1": { desc: 'Voetg W N>Z 1',   cat: 'voetg' },
  "35.2": { desc: 'Voetg W N>Z 2',   cat: 'voetg' },
  "36.1": { desc: 'Voetg W Z>N 1',   cat: 'voetg' },
  "36.2": { desc: 'Voetg W Z>N 2',   cat: 'voetg' },
  "37.1": { desc: 'Voetg N O>W 1',   cat: 'voetg' },
  "37.2": { desc: 'Voetg N O>W 2',   cat: 'voetg' },
  "38.1": { desc: 'Voetg N W<O 1',   cat: 'voetg' },
  "38.2": { desc: 'Voetg N W<O 2',   cat: 'voetg' },
};
