const mongoose = require("mongoose");

require("dotenv").config();
const connectionString = process.env.MONGODB_CONNECTION_STRING;

mongoose
  .connect(connectionString, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.log(err));

const lotterySchema = new mongoose.Schema({
  date: {
    type: String,
    required: true,
    unique: true,
  },
  numbers: {
    type: [Number],
    validate: {
      validator: function (numbers) {
        return numbers.length === 6;
      },
      message: "A lottery entry must contain exactly 6 numbers.",
    },
    required: true,
  },
});

const Lottery = mongoose.model("Lottery", lotterySchema);

module.exports = { Lottery };
