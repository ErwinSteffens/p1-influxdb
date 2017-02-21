const EventEmitter = require('events')
const util = require('util')
const fs = require('fs')
const SerialPort = require('serialport')
const parsePacket = require('./parsePacket')

const startCharacter = '/'
const stopCharacter = '!' 

const defaultPortConfig = {
    baudrate: 115200,
    parity: "none",
    dataBits: 8,
    stopBits: 1
}

var debugMode = false;
var port
var portConfig
var _this

function P1Reader(options) {
    if (options.debug) {
        debugMode = options.debug

        console.log('DEBUG MODE ACTIVE')
    }

    port = options.port
    portConfig = Object.assign({}, defaultPortConfig, options.portConfig)

    _this = this

    EventEmitter.call(this)

    _setupSerialConnection()
}

util.inherits(P1Reader, EventEmitter)

module.exports = {
    Reader: P1Reader,
    Parser: parsePacket
}

/**
 * Setup serial port connection
 */
function _setupSerialConnection() {
    console.log('Connecting to Smart Meter via port: ' + port)

    // Open serial port connection
    var sp = new SerialPort(port, portConfig)

    var received = ''

    sp.on('open', function () {
        console.log('Serial connection established')

        sp.on('data', function (data) {
            received += data.toString()

            var startCharPos = received.indexOf(startCharacter)
            var endCharPos = received.indexOf(stopCharacter)

            // Package is complete if the start- and stop character are received
            if (startCharPos >= 0 && endCharPos >= 0) {
                var packet = received.substr(startCharPos, endCharPos - startCharPos)
                var parsedPacket = parsePacket(packet)

                received = ''

                // Write packet to log if debug mode is active
                if (debugMode) {
                    console.log('Packet', packet)
                    console.log('Parsed packet', parsedPacket)
                }

                if (parsedPacket.timestamp !== null) {
                    _this.emit('reading', parsedPacket)
                } else {
                    console.error('Invalid reading received, event not emitted.')

                    // TODO: set a limiter on the amount of these errors, restart if it occured 5 times
                }
            }
        })
    })

    sp.on('error', function (error) {
        _this.emit('error', error)
    })

    sp.on('close', function () {
        _this.emit('close')

        _setupSerialConnection()
    })
}