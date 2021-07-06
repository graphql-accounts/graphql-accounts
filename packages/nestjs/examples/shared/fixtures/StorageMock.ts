// Storage Mock
export function storageMock() {
  var storage = {};

  return {
    setItem: async function(key, value): Promise<void> {
      storage[key] = value || '';
    },
    getItem: async function(key): Promise<any> {
      return key in storage ? storage[key] : null;
    },
    removeItem: async function(key): Promise<void> {
      delete storage[key];
    },
    get length() {
      return Object.keys(storage).length;
    },
    key: async function(i): Promise<string> {
      var keys = Object.keys(storage);
      return keys[i] || null;
    },
  };
}
