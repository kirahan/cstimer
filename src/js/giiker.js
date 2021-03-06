"use strict";

var DEBUG = true;

var GiikerCube = (function() {

    const SERVICE_UUID = '0000aadb-0000-1000-8000-00805f9b34fb';
    const CHARACTERISTIC_UUID = '0000aadc-0000-1000-8000-00805f9b34fb';

    const SYSTEM_SERVICE_UUID = '0000aaaa-0000-1000-8000-00805f9b34fb';
    const SYSTEM_READ_UUID = '0000aaab-0000-1000-8000-00805f9b34fb';
    const SYSTEM_WRITE_UUID = '0000aaac-0000-1000-8000-00805f9b34fb';

    var UUIDs = {
        cubeService: "0000aadb-0000-1000-8000-00805f9b34fb",
        cubeCharacteristic: "0000aadc-0000-1000-8000-00805f9b34fb"
    };
    var _device = null;

    async function init(timer) {

        if (!window.navigator || !window.navigator.bluetooth) {
            alert("Bluetooth API is not available. Ensure https access, and try chrome with chrome://flags/#enable-experimental-web-platform-features enabled");
            return;
        }

        const device = await window.navigator.bluetooth.requestDevice({
            filters: [{
                namePrefix: 'GiC',
            }],
            optionalServices: [SERVICE_UUID, SYSTEM_SERVICE_UUID],
        });

        const server = await device.gatt.connect();
        const service = await server.getPrimaryService(SERVICE_UUID);
        const characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);
        await characteristic.startNotifications();
        // const value = await characteristic.readValue();
        characteristic.addEventListener('characteristicvaluechanged', onStateChanged);
    }

    function onStateChanged(event) {
        var value = event.target.value;
        parseState(value);
    }

    var cFacelet = [
        [26, 15, 29],
        [20, 8, 9],
        [18, 38, 6],
        [24, 27, 44],
        [51, 35, 17],
        [45, 11, 2],
        [47, 0, 36],
        [53, 42, 33]
    ];

    var eFacelet = [
        [25, 28],
        [23, 12],
        [19, 7],
        [21, 41],
        [32, 16],
        [5, 10],
        [3, 37],
        [30, 43],
        [52, 34],
        [48, 14],
        [46, 1],
        [50, 39]
    ];

    function parseState(value) {
        if (DEBUG) {
            var giikerState = [];
            for (var i = 0; i < 20; i++) {
                giikerState.push("0123456789abcdef" [~~(value.getUint8(i) / 16)]);
                giikerState.push("0123456789abcdef" [value.getUint8(i) % 16]);
            }
            console.log("Raw Data: ", giikerState.join(""));
        }

        var giikerState = [];
        for (var i = 0; i < 20; i++) {
            giikerState.push(~~(value.getUint8(i) / 16));
            giikerState.push(value.getUint8(i) % 16);
            // giikerState.push("0123456789abcdef"[~~(value.getUint8(i) / 16)]);
            // giikerState.push("0123456789abcdef"[value.getUint8(i) % 16]);
        }
        var cp = giikerState.slice(0, 8);
        var co = giikerState.slice(8, 16);
        var ep = giikerState.slice(16, 28);
        var eo0 = giikerState.slice(28, 31);
        var moves = giikerState.slice(32, 40);
        var eo = [];
        for (var i = 0; i < 3; i++) {
            for (var mask = 8; mask != 0; mask >>= 1) {
                eo.push((eo0[i] & mask) ? 1 : 0);
            }
        }
        var cc = new mathlib.CubieCube();
        var coMask = [-1, 1, -1, 1, 1, -1, 1, -1];
        for (var i = 0; i < 8; i++) {
            cc.ca[i] = (cp[i] - 1) | ((3 + co[i] * coMask[i]) % 3) << 3;
        }
        for (var i = 0; i < 12; i++) {
            cc.ea[i] = (ep[i] - 1) << 1 | eo[i];
        }
        var facelet = cc.toFaceCube(cFacelet, eFacelet);
        var prevMoves = [];
        for (var i = 0; i < 4; i++) {
            prevMoves.push("BDLURF" [moves[i * 2] - 1] + " 2'" [moves[i * 2 + 1] - 1]);
        }
        console.log("Current State: ", facelet);
        console.log("A Valid Generator: ", scramble_333.genFacelet(facelet));
        console.log("Previous Moves: ", prevMoves.reverse().join(" "));
        // console.log(scramble_333.genFacelet(facelet));
        callback(facelet, prevMoves);
        return [facelet, prevMoves];
    }

    function stop() {}

    var callback = $.noop;

    function parseStateTest(valueHex) {
        var ab = new ArrayBuffer(20);
        var dv = new DataView(ab);
        for (var i = 0; i < 20; i++) {
            dv.setUint8(i,
                "0123456789abcdef".indexOf(valueHex[i * 2]) * 16 +
                "0123456789abcdef".indexOf(valueHex[i * 2 + 1]));
        }
        return parseState(dv);
    }

    return {
        init: init,
        stop: stop,
        setCallBack: function(func) {
            callback = func;
        },
        parseStateTest: parseStateTest
    }
})();