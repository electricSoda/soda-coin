// Init
const express = require('express')
const app = express()
const session = require("express-session")

const favicon = require('serve-favicon')
const path = require('path')

const PORT = process.env.PORT || 3000

const helmet = require("helmet")
app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          "script-src": ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://code.jquery.com"],
          "style-src": ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
          "img-src": ["'self'", "https://pcgamesn.com", "https://static.wikia.nocookie.net", "https://www.clipartmax.com", "data:"], //security risk, "data:"
          "script-src-attr": ["'self'", "'unsafe-inline'"]
        },
      },
    })
)

// Favicon, view engine, middleware, and session
// creating 1 hour from milliseconds
const oneHour = 1000 * 60 * 60;

app.use(session({
    secret: "&u;,R5D.@8!Lf>Rt3qs9reAaQTsS;>~)}6~=Z%g/0{n(.N45I!J}!ykCmevJ",
    resave: false,
    saveUninitialized: false,
    cookie: {
        path: '/user',
        maxAge: oneHour,
        sameSite: true,
        secure: false
    }
}))

app.use(favicon(path.join(__dirname, 'public', 'images', 'favicon.ico')))

app.set('view engine', "ejs");
app.use(express.urlencoded({ extended: true }))

const db = require('./db.json')

// Main Page
app.get('/', (req, res) => {
    res.render("index")
})

app.post('/', (req, res) => {
    let user = db.users.filter(u => u.name === req.body.query)[0]
    if(!user) {
        res.send({status: 404})
    } else {
        res.send({status: 200, id: user.id})
    }
})

// Routers
const userRouter = require('./routes/user');
app.use('/user', userRouter)

const adminRouter = require("./routes/admin");
const { send } = require('express/lib/response')
app.use('/admin', adminRouter)


// 404
app.use(function (req, res) {
    res.status(404).render("404.ejs")
})

// Mainloop
console.log("Server running on port " + PORT);
app.listen(PORT);