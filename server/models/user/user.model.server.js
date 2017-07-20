/**
 * Created by Jeremy on 7/19/17.
 */

var mongoose = require('mongoose')
var userSchema = require('./user.schema.server')
var userModel = mongoose.model('userModel', userSchema)

userModel.createUser = createUser;
userModel.findUserById = findUserById;
userModel.findAllUsers = findAllUsers;
userModel.findUserByUsername = findUserByUsername;
userModel.findUserByCredentials = findUserByCredentials;
userModel.updateUser = updateUser;
userModel.deleteUser = deleteUser;

module.exports = userModel

function createUser(user) {
    return userModel.create(user)
}

function findUserById(userId) {
    return userModel.findById(userId)
}

function findAllUsers() {
    return userModel.find()
}

function findUserByUsername(username) {
    return userModel.findOne({
        username: username
    })
}

function findUserByCredentials(username, password) {
    return userModel.findOne({
        username: username,
        password: password
    })
}

function updateUser(userId, newUser) {
    delete newUser.password;  // to disallow certain attributes you don't want to update in newUser
    return userModel.update({ _id: userId }, { $set: newUser })
}

function deleteUser(userId) {
    return userModel.remove({
        _id: userId
    })
}
