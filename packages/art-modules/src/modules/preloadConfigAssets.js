export async function preloadConfigAssets(config) {
    const fetchAsBlob = async (url) => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch ${url}`);
        return await response.blob();
    };

    const preloadImage = (url) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = url.startsWith('ipfs://') ? ipfsToHttp(url) : url;
            img.onload = () => resolve(img);
            img.onerror = (e) => reject(e);
        });
    };

    // 1. Preload modal images
    if (config.images) {
        const entries = Object.entries(config.images);
        await Promise.all(entries.map(async ([key, meta]) => {
            meta.img = await preloadImage(meta.imagePath);
        }));
    }
    // 3. Preload model and interactives as blobs
    if (config.modelPath) {
        config.modelBlob = await fetchAsBlob(config.modelPath);
    }
    if (config.interactivesPath) {
        config.interactivesBlob = await fetchAsBlob(config.interactivesPath);
    }

    // 4. Preload sidebar icons
    if (config.sidebar?.items) {
        await Promise.all(config.sidebar.items.map(async (item) => {
            if (item.icon) {
                item.img = await preloadImage(item.icon);
            }
        }));
    }

    function ipfsToHttp(ipfsUri, gateways = ['https://ipfs.io/ipfs', 'https://cloudflare-ipfs.com/ipfs']) {
        if (ipfsUri.startsWith('ipfs://')) {
          const cid = ipfsUri.slice(7);
          return `${gateways[0]}/${cid}`;
        }
        return ipfsUri;
      }
      
}
