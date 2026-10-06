/* Shopify MAX Performance Engine (desktop uniquement), sorti de snippets/indexeddb-cache.liquid :
   un fichier mis en cache par le navigateur au lieu de 34 Ko recopiés dans le HTML de chaque page.
   Chargé seulement hors mobile (le mobile utilise le prefetch natif de Shopify). */
(() => {
  'use strict';

  /* Le prefetch Shopify natif suffit sur mobile et evite de saturer le reseau. */
  if (window.matchMedia('(max-width: 760px)').matches) return;

  if (window.__SHOPIFY_MAX_PERF__) return;
  window.__SHOPIFY_MAX_PERF__ = true;

  const CONFIG = {
    version: '6.0.0',

    dbName: 'ShopifyMaxPerformance',
    dbVersion: 6,

    stores: {
      products: 'products',
      pages: 'pages',
      sections: 'sections',
      paths: 'paths',
      metadata: 'metadata'
    },

    ttl: {
      product: 60 * 60 * 1000,
      section: 15 * 60 * 1000,
      page: 10 * 60 * 1000,
      path: 24 * 60 * 60 * 1000
    },

    limits: {
      products: 150,
      sections: 100,
      pages: 30,
      paths: 150
    },

    maxHtmlBytes: 450000,

    timeout: {
      product: 4500,
      section: 4500,
      page: 5000
    },

    /*
     * Only a small number of predictive requests are allowed.
     * This is intentionally conservative on mobile.
     */
    prefetch: {
      desktopLinks: 12,
      mobileLinks: 6,
      desktopProducts: 24,
      mobileProducts: 10
    }
  };

  class MaxPerformanceEngine {
    constructor() {
      this.db = null;
      this.ready = false;
      this.initPromise = null;
      this.queue = [];
      this.inFlight = new Map();
      this.memory = new Map();
      this.memoryLimit = 80;
      this.destroyed = false;
      this.online = navigator.onLine !== false;
      this.connection = this.getConnection();
      this.mobile = this.isMobile();
      this.concurrency = this.calculateConcurrency();
      this.active = 0;
      this.jobs = [];
      this.productObserver = null;
      this.linkObserver = null;
      this.prefetchSeen = new Set();
    }

    /* =========================================================
       INIT
    ========================================================= */

    async init() {
      if (this.initPromise) return this.initPromise;

      this.initPromise = (async () => {
        this.bindNetworkEvents();

        if (!('indexedDB' in window)) {
          this.startObservers();
          return false;
        }

        try {
          this.db = await this.openDB();
          this.ready = true;
          this.processQueue();

          this.runIdle(() => {
            this.cacheCurrentPage();
            this.startObservers();
            this.installSpeculationRules();
            this.cleanup();
            this.protectStorage();
          });

          return true;
        } catch (error) {
          console.warn('[MaxPerf] IndexedDB unavailable:', error);
          this.startObservers();
          return false;
        }
      })();

      return this.initPromise;
    }

    /* =========================================================
       NETWORK
       ========================================================= */

    getConnection() {
      const c =
        navigator.connection ||
        navigator.mozConnection ||
        navigator.webkitConnection;

      return {
        effectiveType: c?.effectiveType || 'unknown',
        saveData: c?.saveData === true,
        downlink: Number(c?.downlink || 0),
        rtt: Number(c?.rtt || 0)
      };
    }

    calculateConcurrency() {
      if (this.connection.saveData) return 1;

      switch (this.connection.effectiveType) {
        case 'slow-2g': return 1;
        case '2g': return 1;
        case '3g': return this.mobile ? 1 : 2;
        case '4g': return this.mobile ? 2 : 4;
        default: return this.mobile ? 2 : 4;
      }
    }

    canPrefetch() {
      if (!this.online) return false;
      if (this.connection.saveData) return false;

      return !['slow-2g', '2g'].includes(
        this.connection.effectiveType
      );
    }

    bindNetworkEvents() {
      window.addEventListener('online', () => {
        this.online = true;
        this.connection = this.getConnection();
        this.concurrency = this.calculateConcurrency();

        this.runIdle(() => {
          this.cacheCurrentPage();
        });
      }, { passive: true });

      window.addEventListener('offline', () => {
        this.online = false;
      }, { passive: true });

      const connection =
        navigator.connection ||
        navigator.mozConnection ||
        navigator.webkitConnection;

      connection?.addEventListener?.('change', () => {
        this.connection = this.getConnection();
        this.concurrency = this.calculateConcurrency();
      });
    }

    /* =========================================================
       INDEXEDDB
       ========================================================= */

    openDB() {
      return new Promise((resolve, reject) => {
        const request =
          indexedDB.open(
            CONFIG.dbName,
            CONFIG.dbVersion
          );

        request.onerror = () => reject(request.error);

        request.onsuccess = () => {
          const db = request.result;

          db.onversionchange = () => db.close();

          resolve(db);
        };

        request.onupgradeneeded = event => {
          const db = event.target.result;
          const tx = event.target.transaction;

          let products;
          if (!db.objectStoreNames.contains(CONFIG.stores.products)) {
            products = db.createObjectStore(
              CONFIG.stores.products,
              { keyPath: 'handle' }
            );
          } else {
            products = tx.objectStore(CONFIG.stores.products);
          }

          this.safeIndex(products, 'cachedAt', 'cachedAt');

          let pages;
          if (!db.objectStoreNames.contains(CONFIG.stores.pages)) {
            pages = db.createObjectStore(
              CONFIG.stores.pages,
              { keyPath: 'path' }
            );
          } else {
            pages = tx.objectStore(CONFIG.stores.pages);
          }

          this.safeIndex(pages, 'cachedAt', 'cachedAt');

          let sections;
          if (!db.objectStoreNames.contains(CONFIG.stores.sections)) {
            sections = db.createObjectStore(
              CONFIG.stores.sections,
              { keyPath: 'key' }
            );
          } else {
            sections = tx.objectStore(CONFIG.stores.sections);
          }

          this.safeIndex(sections, 'cachedAt', 'cachedAt');

          let paths;
          if (!db.objectStoreNames.contains(CONFIG.stores.paths)) {
            paths = db.createObjectStore(
              CONFIG.stores.paths,
              { keyPath: 'path' }
            );
          } else {
            paths = tx.objectStore(CONFIG.stores.paths);
          }

          this.safeIndex(paths, 'lastVisited', 'lastVisited');

          if (!db.objectStoreNames.contains(CONFIG.stores.metadata)) {
            db.createObjectStore(
              CONFIG.stores.metadata,
              { keyPath: 'key' }
            );
          }
        };
      });
    }

    safeIndex(store, name, keyPath) {
      try {
        if (!store.indexNames.contains(name)) {
          store.createIndex(name, keyPath, { unique: false });
        }
      } catch (_) {}
    }

    transaction(storeName, mode, operation) {
      const execute = () => {
        if (!this.db) {
          return Promise.reject(
            new Error('Database not ready')
          );
        }

        return new Promise((resolve, reject) => {
          let tx;

          try {
            tx = this.db.transaction(
              storeName,
              mode
            );
          } catch (error) {
            reject(error);
            return;
          }

          const store = tx.objectStore(storeName);

          Promise.resolve()
            .then(() => operation(store))
            .then(resolve)
            .catch(reject);
        });
      };

      if (this.ready) return execute();

      return new Promise((resolve, reject) => {
        this.queue.push(() => {
          execute().then(resolve).catch(reject);
        });
      });
    }

    processQueue() {
      const jobs = this.queue.splice(0);

      jobs.forEach(job => {
        try { job(); } catch (_) {}
      });
    }

    get(storeName, key) {
      return this.transaction(
        storeName,
        'readonly',
        store => new Promise((resolve, reject) => {
          const request = store.get(key);

          request.onsuccess = () =>
            resolve(request.result || null);

          request.onerror = () =>
            reject(request.error);
        })
      );
    }

    put(storeName, value) {
      return this.transaction(
        storeName,
        'readwrite',
        store => new Promise((resolve, reject) => {
          const request = store.put(value);

          request.onsuccess = () =>
            resolve(true);

          request.onerror = () =>
            reject(request.error);
        })
      );
    }

    delete(storeName, key) {
      return this.transaction(
        storeName,
        'readwrite',
        store => new Promise(resolve => {
          const request = store.delete(key);

          request.onsuccess = () => resolve(true);
          request.onerror = () => resolve(false);
        })
      );
    }

    /* =========================================================
       MEMORY LRU
       ========================================================= */

    memoryGet(key) {
      if (!this.memory.has(key)) return null;

      const value = this.memory.get(key);

      this.memory.delete(key);
      this.memory.set(key, value);

      return value;
    }

    memorySet(key, value) {
      if (this.memory.has(key)) {
        this.memory.delete(key);
      }

      this.memory.set(key, value);

      while (this.memory.size > this.memoryLimit) {
        this.memory.delete(
          this.memory.keys().next().value
        );
      }

      return value;
    }

    /* =========================================================
       PRODUCTS
       ========================================================= */

    async getProduct(handle) {
      if (!handle) return null;

      const memory =
        this.memoryGet(`product:${handle}`);

      if (memory) return memory;

      const db =
        await this.get(
          CONFIG.stores.products,
          handle
        );

      if (db) {
        this.memorySet(
          `product:${handle}`,
          db
        );
      }

      return db;
    }

    async saveProduct(handle, product) {
      if (!handle || !product) return null;

      const value = {
        handle,
        id: product.id ?? null,
        title: product.title ?? '',
        price: product.price ?? null,
        compareAtPrice:
          product.compare_at_price ?? null,
        available:
          Boolean(product.available),
        variants:
          Array.isArray(product.variants)
            ? product.variants
            : [],
        images:
          Array.isArray(product.images)
            ? product.images
            : [],
        tags:
          Array.isArray(product.tags)
            ? product.tags
            : [],
        type:
          product.product_type ?? '',
        vendor:
          product.vendor ?? '',
        cachedAt: Date.now()
      };

      this.memorySet(
        `product:${handle}`,
        value
      );

      await this.put(
        CONFIG.stores.products,
        value
      );

      return value;
    }

    async product(handle, options = {}) {
      const key = `product:${handle}`;

      if (this.inFlight.has(key)) {
        return this.inFlight.get(key);
      }

      const task = this.fetchProduct(
        handle,
        options
      );

      this.inFlight.set(key, task);

      try {
        return await task;
      } finally {
        this.inFlight.delete(key);
      }
    }

    async fetchProduct(handle, options = {}) {
      const cached =
        await this.getProduct(handle);

      const fresh =
        cached &&
        Date.now() - cached.cachedAt <
          CONFIG.ttl.product;

      if (fresh) {
        return cached;
      }

      if (cached && options.stale !== false) {
        this.enqueue(
          () => this.networkProduct(handle),
          2
        );

        return cached;
      }

      return this.networkProduct(handle);
    }

    async networkProduct(handle) {
      if (!this.online) {
        return this.getProduct(handle);
      }

      const controller =
        new AbortController();

      const timer = setTimeout(
        () => controller.abort(),
        CONFIG.timeout.product
      );

      try {
        const response =
          await fetch(
            `/products/${encodeURIComponent(handle)}.json`,
            {
              credentials: 'same-origin',
              headers: {
                Accept: 'application/json'
              },
              cache: 'no-store',
              signal: controller.signal
            }
          );

        if (!response.ok) return null;

        const json =
          await response.json();

        if (!json?.product) return null;

        return this.saveProduct(
          handle,
          json.product
        );
      } catch (_) {
        return this.getProduct(handle);
      } finally {
        clearTimeout(timer);
      }
    }

    /* =========================================================
       SHOPIFY SECTION RENDERING
       ========================================================= */

    sectionKey(path, sections) {
      const clean = this.normalizePath(path);

      const ids =
        Array.isArray(sections)
          ? sections.slice().sort().join(',')
          : String(sections || '');

      return `${clean}|${ids}`;
    }

    async renderSections(
      path,
      sections,
      options = {}
    ) {
      const key =
        this.sectionKey(
          path,
          sections
        );

      const cached =
        await this.get(
          CONFIG.stores.sections,
          key
        );

      const fresh =
        cached &&
        Date.now() - cached.cachedAt <
          CONFIG.ttl.section;

      if (fresh) {
        return cached.html;
      }

      if (cached && options.stale !== false) {
        this.enqueue(
          () => this.networkSections(
            path,
            sections
          ),
          2
        );

        return cached.html;
      }

      return this.networkSections(
        path,
        sections
      );
    }

    async networkSections(path, sections) {
      if (!this.online) return null;

      const cleanPath =
        this.normalizePath(path);

      if (!cleanPath) return null;

      const list =
        Array.isArray(sections)
          ? sections.filter(Boolean)
          : String(sections || '')
              .split(',')
              .map(x => x.trim())
              .filter(Boolean);

      if (!list.length) return null;

      const url =
        `${cleanPath}?sections=${encodeURIComponent(
          list.join(',')
        )}`;

      const controller =
        new AbortController();

      const timer = setTimeout(
        () => controller.abort(),
        CONFIG.timeout.section
      );

      try {
        const response =
          await fetch(
            url,
            {
              credentials: 'same-origin',
              headers: {
                Accept: 'application/json'
              },
              cache: 'no-store',
              signal: controller.signal
            }
          );

        if (!response.ok) return null;

        const html =
          await response.json();

        const key =
          this.sectionKey(
            cleanPath,
            list
          );

        await this.put(
          CONFIG.stores.sections,
          {
            key,
            html,
            cachedAt: Date.now()
          }
        );

        return html;
      } catch (_) {
        return null;
      } finally {
        clearTimeout(timer);
      }
    }

    /*
     * Helper:
     * render selected sections into the page.
     */
    async updateSections(
      path,
      sectionMap
    ) {
      const sections =
        Object.keys(sectionMap || {});

      if (!sections.length) return false;

      const html =
        await this.renderSections(
          path,
          sections
        );

      if (!html) return false;

      for (const id of sections) {
        const target =
          document.getElementById(
            `shopify-section-${id}`
          );

        if (!target) continue;

        const markup =
          html[id];

        if (!markup) continue;

        const wrapper =
          document.createElement('div');

        wrapper.innerHTML = markup;

        const replacement =
          wrapper.firstElementChild;

        if (replacement) {
          target.replaceWith(
            replacement
          );
        }
      }

      return true;
    }

    /* =========================================================
       PAGE CACHE
       ========================================================= */

    normalizePath(path) {
      try {
        const url =
          new URL(
            path,
            window.location.origin
          );

        if (
          url.origin !==
          window.location.origin
        ) {
          return null;
        }

        return (
          url.pathname
            .replace(/\/{2,}/g, '/')
            .replace(/\/$/, '') || '/'
        );
      } catch (_) {
        return null;
      }
    }

    async cacheCurrentPage() {
      const path =
        this.normalizePath(
          location.pathname
        );

      if (!path) return;

      const main =
        document.querySelector(
          '#content, main, [role="main"]'
        );

      if (!main) return;

      const html =
        main.innerHTML;

      if (
        !html ||
        html.length >
          CONFIG.maxHtmlBytes
      ) {
        return;
      }

      await this.put(
        CONFIG.stores.pages,
        {
          path,
          html,
          title: document.title,
          cachedAt: Date.now()
        }
      );

      await this.put(
        CONFIG.stores.paths,
        {
          path,
          lastVisited: Date.now(),
          cachedAt: Date.now(),
          title: document.title
        }
      );
    }

    async getCachedPage(path) {
      const clean =
        this.normalizePath(path);

      if (!clean) return null;

      return this.get(
        CONFIG.stores.pages,
        clean
      );
    }

    /* =========================================================
       PREDICTIVE PRODUCT PREFETCH
       ========================================================= */

    startObservers() {
      if (!this.canPrefetch()) return;

      this.observeProducts();
      this.observeLinks();
    }

    observeProducts() {
      if (!('IntersectionObserver' in window)) return;

      this.productObserver =
        new IntersectionObserver(
          entries => {
            entries.forEach(entry => {
              if (!entry.isIntersecting) return;

              const handle =
                this.extractProductHandle(
                  entry.target
                );

              if (handle) {
                this.prefetchSeen.add(
                  `product:${handle}`
                );

                this.enqueue(
                  () =>
                    this.product(
                      handle,
                      { stale: true }
                    ),
                  1
                );
              }

              this.productObserver.unobserve(
                entry.target
              );
            });
          },
          {
            rootMargin:
              this.mobile
                ? '350px'
                : '700px'
          }
        );

      const links =
        Array.from(
          document.querySelectorAll(
            'a[href*="/products/"]'
          )
        );

      const limit =
        this.mobile
          ? CONFIG.prefetch.mobileProducts
          : CONFIG.prefetch.desktopProducts;

      links.slice(0, limit)
        .forEach(link => {
          this.productObserver.observe(
            link
          );
        });
    }

    observeLinks() {
      if (!('IntersectionObserver' in window)) return;

      this.linkObserver =
        new IntersectionObserver(
          entries => {
            entries.forEach(entry => {
              if (!entry.isIntersecting) return;

              const path =
                this.safeInternalPath(
                  entry.target
                );

              if (path) {
                this.enqueue(
                  () =>
                    this.prefetchPage(path),
                  0
                );
              }

              this.linkObserver.unobserve(
                entry.target
              );
            });
          },
          {
            rootMargin:
              this.mobile
                ? '600px'
                : '1200px'
          }
        );

      const links =
        Array.from(
          document.querySelectorAll(
            'a[href^="/"]'
          )
        );

      const limit =
        this.mobile
          ? CONFIG.prefetch.mobileLinks
          : CONFIG.prefetch.desktopLinks;

      links.slice(0, limit)
        .forEach(link => {
          if (
            this.safeInternalPath(link)
          ) {
            this.linkObserver.observe(
              link
            );
          }
        });
    }

    async prefetchPage(path) {
      if (!this.canPrefetch()) return;

      const clean =
        this.normalizePath(path);

      if (!clean) return;

      if (
        this.prefetchSeen.has(
          `page:${clean}`
        )
      ) {
        return;
      }

      this.prefetchSeen.add(
        `page:${clean}`
      );

      const cached =
        await this.getCachedPage(
          clean
        );

      if (
        cached &&
        Date.now() -
          cached.cachedAt <
          CONFIG.ttl.page
      ) {
        return;
      }

      const key =
        `page:${clean}`;

      if (this.inFlight.has(key)) {
        return this.inFlight.get(key);
      }

      const promise =
        this.networkPage(clean);

      this.inFlight.set(
        key,
        promise
      );

      try {
        return await promise;
      } finally {
        this.inFlight.delete(key);
      }
    }

    async networkPage(path) {
      if (!this.online) return null;

      const controller =
        new AbortController();

      const timer = setTimeout(
        () => controller.abort(),
        CONFIG.timeout.page
      );

      try {
        const response =
          await fetch(
            path,
            {
              credentials: 'same-origin',
              headers: {
                Accept: 'text/html'
              },
              cache: 'no-store',
              signal: controller.signal
            }
          );

        if (!response.ok) return null;

        const html =
          await response.text();

        /*
         * Store only reasonably sized pages.
         */
        if (
          html.length <=
          CONFIG.maxHtmlBytes
        ) {
          await this.put(
            CONFIG.stores.pages,
            {
              path,
              html,
              cachedAt: Date.now()
            }
          );
        }

        return true;
      } catch (_) {
        return null;
      } finally {
        clearTimeout(timer);
      }
    }

    /* =========================================================
       SPECULATION RULES
       ========================================================= */

    installSpeculationRules() {
      if (!this.canPrefetch()) return;

      if (
        !HTMLScriptElement.supports ||
        !HTMLScriptElement.supports(
          'speculationrules'
        )
      ) {
        return;
      }

      if (
        document.querySelector(
          'script[type="speculationrules"]'
        )
      ) {
        return;
      }

      const script =
        document.createElement('script');

      script.type =
        'speculationrules';

      const mobile =
        this.mobile;

      script.textContent =
        JSON.stringify({
          prefetch: [
            {
              source: 'document',
              where: {
                and: [
                  {
                    href_matches:
                      '/*'
                  },
                  {
                    not: {
                      href_matches:
                        '*/cart*'
                    }
                  },
                  {
                    not: {
                      href_matches:
                        '*/checkout*'
                    }
                  },
                  {
                    not: {
                      href_matches:
                        '*/account*'
                    }
                  },
                  {
                    not: {
                      href_matches:
                        '*/admin*'
                    }
                  }
                ]
              },
              eagerness:
                mobile
                  ? 'moderate'
                  : 'conservative'
            }
          ]
        });

      document.head.appendChild(
        script
      );
    }

    /* =========================================================
       PRIORITY QUEUE
       ========================================================= */

    enqueue(job, priority = 0) {
      if (this.destroyed) return;

      this.jobs.push({
        job,
        priority,
        id: Math.random()
      });

      this.jobs.sort(
        (a, b) =>
          b.priority - a.priority
      );

      this.drain();
    }

    drain() {
      while (
        this.active <
          this.concurrency &&
        this.jobs.length
      ) {
        const item =
          this.jobs.shift();

        this.active++;

        Promise.resolve()
          .then(item.job)
          .catch(() => {})
          .finally(() => {
            this.active--;
            this.drain();
          });
      }
    }

    /* =========================================================
       CLEANUP / QUOTA
       ========================================================= */

    async cleanup() {
      if (!this.ready) return;

      const now = Date.now();

      await this.deleteOlder(
        CONFIG.stores.products,
        'cachedAt',
        now -
          CONFIG.ttl.product * 3
      );

      await this.deleteOlder(
        CONFIG.stores.pages,
        'cachedAt',
        now -
          CONFIG.ttl.page * 4
      );

      await this.deleteOlder(
        CONFIG.stores.sections,
        'cachedAt',
        now -
          CONFIG.ttl.section * 4
      );

      await this.deleteOlder(
        CONFIG.stores.paths,
        'lastVisited',
        now -
          CONFIG.ttl.path * 3
      );

      await this.trim(
        CONFIG.stores.products,
        CONFIG.limits.products,
        'cachedAt'
      );

      await this.trim(
        CONFIG.stores.pages,
        CONFIG.limits.pages,
        'cachedAt'
      );

      await this.trim(
        CONFIG.stores.sections,
        CONFIG.limits.sections,
        'cachedAt'
      );

      await this.trim(
        CONFIG.stores.paths,
        CONFIG.limits.paths,
        'lastVisited'
      );
    }

    async deleteOlder(
      storeName,
      indexName,
      cutoff
    ) {
      return this.transaction(
        storeName,
        'readwrite',
        store =>
          new Promise(resolve => {
            let index;

            try {
              index =
                store.index(indexName);
            } catch (_) {
              resolve();
              return;
            }

            const request =
              index.openCursor(
                IDBKeyRange.upperBound(
                  cutoff
                )
              );

            request.onsuccess =
              event => {
                const cursor =
                  event.target.result;

                if (!cursor) {
                  resolve();
                  return;
                }

                try {
                  cursor.delete();
                } catch (_) {}

                cursor.continue();
              };

            request.onerror =
              () => resolve();
          })
      );
    }

    async trim(
      storeName,
      limit,
      indexName
    ) {
      return this.transaction(
        storeName,
        'readwrite',
        store =>
          new Promise(resolve => {
            let index;

            try {
              index =
                store.index(indexName);
            } catch (_) {
              resolve();
              return;
            }

            const items = [];

            const request =
              index.openCursor();

            request.onsuccess =
              event => {
                const cursor =
                  event.target.result;

                if (cursor) {
                  items.push({
                    key:
                      cursor.primaryKey,
                    time:
                      Number(
                        cursor.value[
                          indexName
                        ] || 0
                      )
                  });

                  cursor.continue();
                  return;
                }

                items.sort(
                  (a, b) =>
                    a.time - b.time
                );

                const remove =
                  Math.max(
                    0,
                    items.length - limit
                  );

                for (
                  let i = 0;
                  i < remove;
                  i++
                ) {
                  try {
                    store.delete(
                      items[i].key
                    );
                  } catch (_) {}
                }

                resolve();
              };

            request.onerror =
              () => resolve();
          })
      );
    }

    async protectStorage() {
      if (
        !navigator.storage?.estimate
      ) {
        return;
      }

      try {
        const estimate =
          await navigator.storage.estimate();

        if (!estimate.quota) return;

        const ratio =
          estimate.usage /
          estimate.quota;

        if (ratio > 0.75) {
          await this.cleanup();
        }

        if (ratio > 0.90) {
          await this.clearOldAggressively();
        }
      } catch (_) {}
    }

    async clearOldAggressively() {
      const cutoff =
        Date.now() -
        30 * 60 * 1000;

      await this.deleteOlder(
        CONFIG.stores.products,
        'cachedAt',
        cutoff
      );

      await this.deleteOlder(
        CONFIG.stores.pages,
        'cachedAt',
        cutoff
      );

      await this.deleteOlder(
        CONFIG.stores.sections,
        'cachedAt',
        cutoff
      );
    }

    /* =========================================================
       SAFE URL HELPERS
       ========================================================= */

    safeInternalPath(link) {
      try {
        const url =
          new URL(
            link.href,
            location.origin
          );

        if (
          url.origin !==
          location.origin
        ) {
          return null;
        }

        const path =
          url.pathname;

        const blocked = [
          '/cart',
          '/checkout',
          '/account',
          '/admin',
          '/search',
          '/challenge',
          '/password'
        ];

        if (
          blocked.some(
            x =>
              path === x ||
              path.startsWith(`${x}/`)
          )
        ) {
          return null;
        }

        /*
         * Avoid files, feeds and downloads.
         */
        if (/\.[a-z0-9]+$/i.test(path)) {
          return null;
        }

        return this.normalizePath(path);
      } catch (_) {
        return null;
      }
    }

    extractProductHandle(link) {
      try {
        const url =
          new URL(
            link.href,
            location.origin
          );

        const match =
          url.pathname.match(
            /\/products\/([^/?#]+)/
          );

        return match
          ? decodeURIComponent(
              match[1]
            )
          : null;
      } catch (_) {
        return null;
      }
    }

    isMobile() {
      return /Android|iPhone|iPad|iPod|Mobile/i
        .test(
          navigator.userAgent
        );
    }

    runIdle(callback) {
      if (
        typeof requestIdleCallback ===
        'function'
      ) {
        requestIdleCallback(
          callback,
          { timeout: 2500 }
        );
      } else {
        setTimeout(
          callback,
          this.mobile
            ? 1200
            : 400
        );
      }
    }

    /* =========================================================
       PUBLIC API
       ========================================================= */

    async clearCache() {
      this.memory.clear();

      if (!this.ready) return true;

      for (
        const storeName of
        Object.values(CONFIG.stores)
      ) {
        await this.transaction(
          storeName,
          'readwrite',
          store =>
            new Promise(resolve => {
              const request =
                store.clear();

              request.onsuccess =
                () => resolve();

              request.onerror =
                () => resolve();
            })
        );
      }

      return true;
    }

    stats() {
      return {
        version: CONFIG.version,
        mobile: this.mobile,
        online: this.online,
        connection: this.connection,
        concurrency: this.concurrency,
        activeJobs: this.active,
        queuedJobs: this.jobs.length,
        memoryEntries: this.memory.size
      };
    }

    destroy() {
      this.destroyed = true;

      try {
        this.productObserver?.disconnect();
        this.linkObserver?.disconnect();
        this.db?.close();
      } catch (_) {}

      this.productObserver = null;
      this.linkObserver = null;
      this.memory.clear();
      this.inFlight.clear();
      this.jobs.length = 0;
    }
  }

  /* ===========================================================
     START ENGINE
     =========================================================== */

  const engine =
    new MaxPerformanceEngine();

  /*
   * Global API.
   *
   * Examples:
   *
   * ShopifyMaxPerformance.product('blue-shirt')
   * ShopifyMaxPerformance.renderSections(
   *   '/products/blue-shirt',
   *   ['main-product']
   * )
   * ShopifyMaxPerformance.stats()
   */
  window.ShopifyMaxPerformance =
    engine;

  if (
    document.readyState ===
    'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      () => engine.init(),
      { once: true }
    );
  } else {
    engine.init();
  }

})();
