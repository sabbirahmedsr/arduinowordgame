class AssetManager {
    constructor() {
        this.images = {};
        this.config = null;
    }

    /**
     * Recursively retrieves all string paths from the JSON object
     */
    _extractPaths(obj, paths = []) {
        for (let key in obj) {
            if (typeof obj[key] === 'string' && key !== 'basePath') {
                paths.push(obj[key]);
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                this._extractPaths(obj[key], paths);
            }
        }
        return paths;
    }

    /**
     * Fetches resources.json and preloads all images
     */
    async loadResources(jsonPath = './data/resources.json') {
        try {
            const response = await fetch(jsonPath);
            this.config = await response.json();

            const basePath = this.config.basePath || './image/';
            const relativePaths = this._extractPaths(this.config);

            const loadPromises = relativePaths.map(relativePath => {
                return new Promise(resolve => {
                    const img = new Image();
                    const fullPath = basePath + relativePath;

                    img.onload = () => {
                        this.images[relativePath] = img;
                        resolve(img);
                    };

                    img.onerror = () => {
                        console.warn(`Failed to load image at: ${fullPath}`);
                        resolve(null);
                    };

                    img.src = fullPath;
                });
            });

            await Promise.all(loadPromises);
            console.log("All game resources loaded successfully.");
        } catch (error) {
            console.error("Error loading resources.json:", error);
        }
    }

    /**
     * Retrieves loaded Image object by relative path key
     */
    get(relativePath) {
        return this.images[relativePath] || null;
    }
}