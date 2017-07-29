/**
 * Created by Jeremy on 6/20/17.
 */

var app = require('../../express')
var userModel = require('../models/user/user.model.server')

var passport = require('passport')

passport.serializeUser(function (user, done) {
     done(null, user._id)
})

passport.deserializeUser(function (_id, done) {
    userModel
        .findUserById(_id)
        .then(function (user) {
            done(null, user)
        }, function (err) {
            done(err, null)
        })
})

/****************************** URL Endpoints *********************************/

app.get   ('/api/assignment/user', findUserByCredentials)
app.post  ('/api/assignment/login', passport.authenticate('local'), login)
app.post  ('/api/assignment/logout', logout)
app.get   ('/api/assignment/checkLoggedIn', checkLoggedIn)
app.get   ('/api/assignment/checkAdmin', checkAdmin)

app.get   ('/api/assignment/user/:userId', findUserById)
app.post  ('/api/assignment/user', registerUser)
app.delete('/api/assignment/user/:userId', unregisterUser)
app.get   ('/api/assignment/admin/user', isAdmin, findAllUsers)
app.put   ('/api/assignment/user/:userId', updateUser)
app.delete('/api/assignment/admin/user/:userId', isAdmin, deleteUser)


/****************************** Local Strategy *********************************/

var LocalStrategy = require('passport-local').Strategy
passport.use(new LocalStrategy(localStrategy))
function localStrategy(username, password, done) {
    userModel
        .findUserByCredentials(username, password)
        .then(
            function(user) {
                if (user)  return done(null, user)
                return done(null, false)  // 如果身份验证失败, 则 false 会直接导致请求中断,
            },                             // 返回 401 Unauthorized 否则继续执行之后的 login 函数
            function(err) {
                return done(err)
            }
        )
}

/****************************** Google Strategy *********************************/

var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy

var googleConfig = {
    clientID     : process.env.GOOGLE_CLIENT_ID,
    clientSecret : process.env.GOOGLE_CLIENT_SECRET,
    callbackURL  : process.env.GOOGLE_CALLBACK_URL
}

passport.use(new GoogleStrategy(googleConfig, googleStrategy))
app.get('/auth/google',               // redirects to Google, asking for profile and email
    passport.authenticate('google', {
        scope : ['profile', 'email']
    }))
app.get('/auth/google/callback',      // Google will call this url back and redirect for success/failure
    passport.authenticate('google', {
        successRedirect: '/assignment/index.html#!/profile',
        failureRedirect: '/assignment/index.html#!/login'
    }))

function googleStrategy(token, refreshToken, profile, done) {
    userModel
        .findUserByGoogleId(profile.id)
        .then(
            function(user) {
                if (user) {
                    return done(null, user)
                } else {
                    var email = profile.emails[0].value
                    var emailParts = email.split("@")
                    var newGoogleUser = {
                        username:  emailParts[0],
                        firstName: profile.name.givenName,
                        lastName:  profile.name.familyName,
                        email:     email,
                        google: {
                            id:    profile.id,
                            token: token
                        }
                    }
                    return userModel.createUser(newGoogleUser)
                }
            },
            function(err) {
                if (err) return done(err)
            }
        )
        .then(
            function(user) {
                return done(null, user)
            },
            function(err) {
                if (err) return done(err)
            }
        )
}


/****************************** Function Declarations *********************************/

function login(req, res) {
    var user = req.user
    res.json(user)
}

function logout(req, res) {
    req.logout()  // invalidates the current user from the session/cookie
    res.sendStatus(200)
}

function checkLoggedIn(req, res) {
    res.send(req.isAuthenticated() ? req.user : '0')  // isAuthenticated() is a convenient function that checks
}                                                     // if passport has already authenticated the user in the session

function checkAdmin(req, res) {
    res.send(req.isAuthenticated() && req.user.roles.indexOf('ADMIN') >= 0 ? req.user : '0')
}

function findUserByCredentials(req, res) {
    var username = req.query['username']
    var password = req.query['password']
    if (username && password) {  // finding a particular user based on username & password passed using queryString
        userModel
            .findUserByCredentials(username, password)
            .then(function (user) {
                if (user)  res.json(user)
                else       res.sendStatus(404)
            })
    } else if (username) {
        userModel
            .findUserByUsername(username)
            .then(function (user) {
                if (user) {
                    res.status(200).send({ error: 'The username is already taken.' })
                } else {
                    res.sendStatus(200)
                }
            })
    }
}

function findAllUsers(req, res) {
    userModel
        .findAllUsers()
        .then(function (users) {
            res.json(users)
        })
}

function findUserById(req, res) {
    var userId = req.params["userId"]

    userModel
        .findUserById(userId)
        .then(function (user) {
            res.json(user)
        }, function () {
            res.sendStatus(404)
        })
}

function registerUser(req, res) {
    var user = req.body
    userModel
        .createUser(user)
        .then(
            function (user) {
                if (req.user && req.user.roles.indexOf('ADMIN') >= 0) {
                    res.sendStatus(200)  // Admins creating users from admin portal
                } else {
                    req.logIn(user, function (status) {
                        res.send(status)
                    })
                }
            },

            function (obj) {
                res.status(403).send(obj.errors || obj)
            }
        )
}

function unregisterUser(req, res) {
    var userId = req.params['userId']
    userModel
        .deleteUser(userId)
        .then(function () {
            req.logout()
            res.send(200)
        })
}

function updateUser(req, res) {
    var newUser = req.body
    userModel
        .updateUser(newUser._id, newUser)
        .then(function (status) {
            res.send(status)
        }, function (obj) {
            res.status(403).send(obj.errors)
        })
}

function deleteUser(req, res) {
    var userId = req.params['userId']
    userModel
        .deleteUser(userId)
        .then(function (status) {
            res.send(status)
        }, function () {
            res.sendStatus(404)
        })
}

function isAdmin(req, res, next) {
    if (req.isAuthenticated() && req.user.roles.indexOf('ADMIN') >= 0) {
        next()
    } else {
        res.sendStatus(401)
    }
}
