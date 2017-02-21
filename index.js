const Influx = require('influx'),
      config = require('config'),
      P1 = require('./lib/p1')

const influxConfig = config.get('influxdb'),
      p1Config = config.get('p1')

var lastGasValue

const influx = new Influx.InfluxDB({
    host: influxConfig.host,
    database: influxConfig.database,
    username: influxConfig.username,
    password: influxConfig.password,
    schema: [
        {
            measurement: 'electricity',
            tags: [],
            fields: {
                received: Influx.FieldType.FLOAT,
                received_value_low: Influx.FieldType.FLOAT,
                received_value_high: Influx.FieldType.FLOAT
            }
        },
        {
            measurement: 'gas',
            tags: [],
            fields: {
                received: Influx.FieldType.FLOAT,
                received_value: Influx.FieldType.FLOAT,
            }
        }
    ]
})

const sp = new P1.Reader({
    port: p1Config.port,
    portConfig: {
        baudRate: p1Config.baudRate
    }
})

sp.on('reading', function (packet) {
    var points = [];

    var gasValue = packet.gas.reading;
    if (lastGasValue)
    {
        var gasUsed = gasValue - lastGasValue

        if (gasUsed) {
            if (p1Config.debug) {
                console.log(`Gas. Value: ${gasValue}, Last value: ${lastGasValue}, Used: ${gasUsed}`)
            }

            points.push({
                measurement: 'gas',
                fields: { 
                    received: gasUsed,
                    received_value: gasValue
                },
            });
        }
    }
    lastGasValue = gasValue;

    var electricityUsed = packet.electricity.received.actual.reading;
    if (electricityUsed) {
        var electricityReceivedLow = packet.electricity.received.tariff1.reading;
        var electricityReceivedHigh = packet.electricity.received.tariff2.reading;

        if (p1Config.debug) 
        {
            console.log(`Electricity. Low: ${electricityReceivedLow}, High: ${electricityReceivedHigh}, Used: ${electricityUsed}`)	
        }

        points.push({
            measurement: 'electricity',
            fields: { 
                received: electricityUsed,
                received_value_low: electricityReceivedLow,
                received_value_high: electricityReceivedHigh
            },
        });
    }

    if (points.length) {
        influx.writePoints(points).catch(err => {
            console.error('Error writing to InfluxDB',  err)
        })
    }
})

sp.on('error', function (error) {
    console.error('P1Reader error', error)
})