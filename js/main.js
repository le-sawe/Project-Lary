import { setupTabs }   from './tabs.js';
import { initNo2Tab }  from './no2/index.js';
import { initPm10Tab } from './pm10/index.js';
import { initPm25Tab } from './pm25/index.js';

setupTabs({
  no2:  initNo2Tab,
  pm10: initPm10Tab,
  pm25: initPm25Tab,
});
