const tf = require('@tensorflow/tfjs');
let model

function makeModel(inputResolution){
    model = tf.sequential();

    model.add(tf.layers.conv2d({
        inputShape: [inputResolution[0], inputResolution[1], 1],
        kernelSize: 3,
        filters: 16,
        activation: 'relu',
    }));

    model.add(tf.layers.conv2d({
        kernelSize: 3,
        filters: 32,
        activation: 'relu',
    }));

    model.add(tf.layers.maxPooling2d({
        poolSize: [2, 2],
    }));

    model.add(tf.layers.flatten());

    model.add(tf.layers.dense({
        units: 128,
        activation: 'relu',
    }));

    model.add(tf.layers.dense({
        units: 10,
        activation: 'softmax',
    }));

    model.compile({
        optimizer: 'adam',
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy'],
    });

    return model;
}

module.exports = {
    makeModel,
}