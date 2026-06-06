import { setupTabs }  from './tabs.js';
import { initNo2Tab } from './no2/index.js';

setupTabs({
  no2: initNo2Tab,
  // pm25: initPm25Tab,   // future
  // ozone: initOzoneTab, // future
});
