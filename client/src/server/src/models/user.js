import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true
    },

    password: {
        type: String,
        required: true
    },

    profile_url: {
        type: String,
        default: null
    },
    coins: {
    type: Number,
    default: 1000
    }

})

const User = mongoose.model('user', userSchema);

export default User