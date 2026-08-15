/* *********************************************************
   Module 1.0.0 : Asset Manager
   Description: Handles async preloading of all images including word objects
************************************************************/

class AssetManager {
    constructor() {
        this.images = {};
        this.config = null;
    }

    async loadResources(jsonUrl = './data/resources.json') {
        try {
            const response = await fetch(jsonUrl);
            this.config = await response.json();
            const basePath = this.config.basePath || './image/';

            const pathsToLoad = this.extractPaths(this.config);
            const loadPromises = pathsToLoad.map(path => this.loadImage(basePath, path));
            
            await Promise.all(loadPromises);
        } catch (error) {
            console.error("Error loading resources:", error);
        }
    }

    extractPaths(obj) {
        let paths = [];

        for (const key in obj) {
            if (key === 'basePath') continue;

            const value = obj[key];

            if (typeof value === 'string') {
                paths.push(value);
            } else if (Array.isArray(value)) {
                value.forEach(item => {
                    if (typeof item === 'string') {
                        paths.push(item);
                    } else if (typeof item === 'object' && item !== null && item.image) {
                        paths.push(item.image);
                    } else if (typeof item === 'object') {
                        paths = paths.concat(this.extractPaths(item));
                    }
                });
            } else if (typeof value === 'object' && value !== null) {
                paths = paths.concat(this.extractPaths(value));
            }
        }

        return paths;
    }

    loadImage(basePath, relativePath) {
        return new Promise((resolve) => {
            const img = new Image();
            const fullPath = basePath + relativePath;

            img.onload = () => {
                this.images[relativePath] = img;
                resolve(img);
            };

            img.onerror = () => {
                console.warn(`Failed to load image at: ${fullPath}`);
                this.images[relativePath] = null;
                resolve(null);
            };

            img.src = fullPath;
        });
    }

    get(relativePath) {
        return this.images[relativePath] || null;
    }
}