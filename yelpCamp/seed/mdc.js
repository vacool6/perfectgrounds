const mongoose = require('mongoose');
const cities = require('./city');
const { descriptors, places } = require('./title');
const Campground = require('../models/campground');

mongoose.connect('mongodb://localhost:27017/yelp-camp', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, "connection error:"));
db.once('open', () => console.log("Database Connected!!!"));

const sample = array => array[Math.floor(Math.random() * array.length)];

const flood = async () => {
    await Campground.deleteMany({});
    for (let i = 0; i < 10; i++) {
        let randNum = Math.floor(Math.random() * 1000);
        let randPrice = Math.floor(Math.random() * 3000) + 100.99;
        const camp = new Campground({
            author: '61a4822187ee70d0b8a72af5',
            location: `${cities[randNum].city}, ${cities[randNum].state}`,
            title: `${sample(descriptors)} ${sample(places)}`,
            img: "https://source.unsplash.com/collection/483251/1600x900",
            description: "Lorem ipsum dolor, sit amet consectetur adipisicing elit. Ducimus, molestiae officiis! Doloribus corporis repellendus sed, illo odit, dolorem nisi natus dolore rerum sit minus perspiciatis temporibus veritatis a sunt ducimus?",
            price: randPrice
        })
        await camp.save();
    }
}

flood().then(() => {
    db.close()
})
