THIS IS npm repo for GALLERY project [ all JS modules, no index, no css ]

added gallery_config.json for reference.[edit it and upload to IPFS --- get CID and paste to main.js]

// main.js
import { buildGallery } from '@your-org/art-modules';

// your own config CID (pointing at a different JSON on IPFS)
const CONFIG_CID = '<CID>';
const CONFIG_URL = `https://ipfs.io/ipfs/${CONFIG_CID}`;

(async () => {
  const res = await fetch(CONFIG_URL);
  const cfg = await res.json();
  await buildGallery(cfg);
})();

//
after updating code in packages/modules/src/:
npm run build:modules