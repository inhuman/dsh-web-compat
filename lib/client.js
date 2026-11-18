/**
 * `crypto.randomUUID` is a secure-context API: it exists on
 * `http://127.0.0.1` and `http://localhost`, and is `undefined` on a plain HTTP
 * origin such as `http://192.168.1.248:3080`. Client plugins that mint tab or
 * record ids with it throw `TypeError: crypto.randomUUID is not a function`
 * on such an origin, and the click that triggered them does nothing at all.
 *
 * This client half defines the method when the platform withholds it, using
 * `crypto.getRandomValues`, which is available in insecure contexts. It leaves
 * a native implementation untouched and removes its own definition on
 * disposal.
 */
window.__ModuleLoader__.load({
  id: '@inhuman/dsh-web-compat',
  factory() {
    var module = { exports: {} };
    var exports = module.exports;

    /**
     * Format 16 random bytes as an RFC 4122 version 4 UUID.
     * @param getRandomValues - CSPRNG-backed filler for a 16-byte array.
     * @returns the UUID text.
     */
    function uuidFromRandomValues(getRandomValues) {
      var bytes = new Uint8Array(16);
      getRandomValues(bytes);
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      var hex = '';
      for (var index = 0; index < bytes.length; index += 1) hex += bytes[index].toString(16).padStart(2, '0');
      return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) + '-' + hex.slice(16, 20) + '-' + hex.slice(20);
    }

    /**
     * Define `randomUUID` on the crypto holder when the platform omits it.
     * @param hostCrypto - the page's `crypto` object, whose prototype carries the web APIs.
     * @returns a disposer that removes only a definition this call installed.
     */
    function installCryptoRandomUUID(hostCrypto) {
      var noop = function () {};
      if (typeof hostCrypto !== 'object' || hostCrypto === null) return noop;
      if (typeof hostCrypto.randomUUID === 'function') return noop;
      if (typeof hostCrypto.getRandomValues !== 'function') return noop;
      var holder = Object.getPrototypeOf(hostCrypto) || hostCrypto;
      var descriptor = {
        configurable: true,
        writable: true,
        value: function randomUUID() { return uuidFromRandomValues(hostCrypto.getRandomValues.bind(hostCrypto)) },
      };
      try {
        Object.defineProperty(holder, 'randomUUID', descriptor);
      } catch (error) {
        if (holder === hostCrypto) throw error;
        Object.defineProperty(hostCrypto, 'randomUUID', descriptor);
        holder = hostCrypto;
      }
      return function () {
        try {
          delete holder.randomUUID;
        } catch (error) {
          // A frozen holder keeps the definition; every later request still
          // gets a valid UUID, which is the point of the shim.
        }
      };
    }

    /**
     * Install the polyfill for the lifetime of this client plugin.
     * @param ctx - client plugin scope providing `effect`.
     */
    function apply(ctx) {
      ctx.effect(function () {
        return installCryptoRandomUUID(globalThis.crypto);
      }, 'dsh-web-compat: crypto.randomUUID');
    }

    exports.name = '@inhuman/dsh-web-compat';
    exports.inject = [];
    exports.apply = apply;
    exports.uuidFromRandomValues = uuidFromRandomValues;
    exports.installCryptoRandomUUID = installCryptoRandomUUID;
    return module.exports;
  },
});
