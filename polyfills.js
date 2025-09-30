/**
 * Polyfills for Node.js compatibility
 * Ensures compatibility with older Node.js versions on deployment platforms
 */

// Polyfill for File API if not available (Node.js < 20)
if (typeof globalThis.File === 'undefined') {
  // Simple File polyfill for server-side compatibility
  globalThis.File = class File {
    constructor(fileBits, fileName, options = {}) {
      this.name = fileName;
      this.type = options.type || '';
      this.lastModified = options.lastModified || Date.now();
      this.size = 0;
      
      if (Array.isArray(fileBits)) {
        this.size = fileBits.reduce((total, bit) => {
          if (typeof bit === 'string') return total + bit.length;
          if (bit instanceof ArrayBuffer) return total + bit.byteLength;
          if (bit && bit.length !== undefined) return total + bit.length;
          return total;
        }, 0);
      }
    }
    
    stream() {
      throw new Error('File.stream() not implemented in polyfill');
    }
    
    arrayBuffer() {
      throw new Error('File.arrayBuffer() not implemented in polyfill');
    }
    
    text() {
      throw new Error('File.text() not implemented in polyfill');
    }
  };
}

// Polyfill for FormData if needed
if (typeof globalThis.FormData === 'undefined') {
  globalThis.FormData = class FormData {
    constructor() {
      this._data = new Map();
    }
    
    append(name, value, filename) {
      if (!this._data.has(name)) {
        this._data.set(name, []);
      }
      this._data.get(name).push({ value, filename });
    }
    
    get(name) {
      const values = this._data.get(name);
      return values ? values[0].value : null;
    }
    
    getAll(name) {
      const values = this._data.get(name);
      return values ? values.map(v => v.value) : [];
    }
    
    has(name) {
      return this._data.has(name);
    }
    
    set(name, value, filename) {
      this._data.set(name, [{ value, filename }]);
    }
    
    delete(name) {
      this._data.delete(name);
    }
    
    *entries() {
      for (const [name, values] of this._data) {
        for (const { value } of values) {
          yield [name, value];
        }
      }
    }
    
    *keys() {
      for (const name of this._data.keys()) {
        yield name;
      }
    }
    
    *values() {
      for (const [, values] of this._data) {
        for (const { value } of values) {
          yield value;
        }
      }
    }
    
    [Symbol.iterator]() {
      return this.entries();
    }
  };
}

console.log('✅ Node.js compatibility polyfills loaded');