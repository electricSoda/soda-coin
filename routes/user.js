if (typeof JSON.clone !== "function") {
    JSON.clone = function(obj) {
        return JSON.parse(JSON.stringify(obj))
    }
}

const express = require("express");
const router = express.Router();

const fs = require('fs')

const fileName = "../db.json"
let db = require(fileName)

const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto')
const saltRounds = 15;

// User Interface
router.get('/', (req, res) => {
    if (req.session.user) {
        if (res.statusCode == 100) {
            res.render("user/main", { user: req.session.user, notification: "Request sent!" })
        } else {
            res.render("user/main", { user: req.session.user })
        }        
    } else {
        res.render("404")
    }
})

// AJAX Request
router.post('/refresh', (req, res) => {
    if (!req.session.user) {
        res.render("404")
    } else {
        delete require.cache[require.resolve(fileName)]   // Deleting loaded module
        db = require(fileName);

        let requests = db.requests.filter(request => request.to === req.session.user.id)
        let user = db.users.filter(user => user.id === req.session.user.id)[0]
        res.json({
            user: user,
            requests: requests
        })
    }
})

// User sign in
router.post('/', (req, res) => {
    if (req.body.email) {
        // User signs up
        // Hash Password
        let id = randomUUID()
        let user = {
            "name": req.body.username, 
            "email": req.body.email,
            "password": "undisclosed",
            "balance": 0,
            "history": [],
            "rank": "user",
            "id": id
        }

        bcrypt.hash(req.body.password, saltRounds, (err, hash) => {
            if (err) {
                console.log(err)
            }
            user["password"] = hash;
            
            db.users.push(user)
            fs.writeFileSync("db.json", JSON.stringify(db, null, 2));
        });

        delete require.cache[require.resolve(fileName)]   // Deleting loaded module
        db = require(fileName);

        req.session.user = user
        console.log(`User signed up: ${req.body.username}`)
        res.render('user/main', { user: user })
    } else {
        let user = db.users.filter(user => user.name === req.body.username)[0];

        if (req.body.username.length == 0 && req.body.password.length == 0) {
            res.render('user/login', {username: req.body.username, password: req.body.password, error: "The forms cannot be empty!"})
        } else if (!user) {
            res.render('user/login', {username: req.body.username, password: req.body.password, error: "Invalid username."})
        } else if (req.body.password.length == 0) {
            res.render('user/login', {username: req.body.username, password: req.body.password, error: "Password can't be 0 characters!"})
        } else {
            (async () => {
                let pass = await bcrypt.compare(req.body.password, user.password);
                if (pass === true) {
                    req.session.user = user
                    console.log(user.name + ' logged in')
                    res.render("user/main", { user: user })
                } else {
                    res.render('user/login', {username: req.body.username, password: req.body.password, error: "Invalid Password!"})
                }
            })();  
        }
    }
})

// Transfer
router.get("/transfer", (req, res) => {
    if (!req.session.user) {
        res.render("404")
    }
    res.render('user/transfer')
})

router.post("/transfer", (req, res) => {
    if (!req.session.user) {
        res.render("404")
    } else {
        const date = new Date()
        let id = randomUUID()
        db.requests.push({
            "from": req.session.user.id,
            "to": req.body.id,
            "type": "TRANSFER",
            "value": parseFloat(req.body.amount),
            "timestamp": date.toLocaleString(),
            "id": id
        })

        let u = db.users.filter(user => user.id == req.session.user.id)[0]
        u.history.push({
            "type": "SEND_TRANSFER",
            "to": req.body.id,
            "value": parseFloat(req.body.amount),
            "timestamp": date.toLocaleString()
        })

        fs.writeFileSync("db.json", JSON.stringify(db, null, 2));

        delete require.cache[require.resolve(fileName)]   // Deleting loaded module
        db = require(fileName);

        res.redirect('/user')
    }
})

// Accept transfer
router.post('/accept', (req, res) => {
    if (!req.session.user) {
        res.render("404")
    } else {
        let request = db.requests.filter(reqs => reqs.id == req.body.id)[0]
        let userTo = db.users.filter(y => y.id == request.to)[0]
        let userFrom = db.users.filter(z => z.id == request.from)[0]

        userTo.balance += request.value
        userFrom.balance -= request.value

        let index = db.requests.findIndex(x => x.id == request.id)
        db.requests.splice(index, 1)

        const date = new Date()

        userTo.history.push({
            "type": "ACCEPT_TRANSFER",
            "from": userFrom.id,
            "value": parseFloat(request.value),
            "timestamp": date.toLocaleString()
        })

        userFrom.history.push({
            "type": "TRANSFER_SUCCESS",
            "to": userTo.id,
            "value": parseFloat(request.value),
            "timestamp": date.toLocaleString()
        })

        fs.writeFileSync("db.json", JSON.stringify(db, null, 2));

        delete require.cache[require.resolve(fileName)]   // Deleting loaded module
        db = require(fileName);

        res.json({"status": 200})
    }
})

// Decline transfer
router.post('/decline', (req, res) => {
    if (!req.session.user) {
        res.render("404")
    } else {
        let request = db.requests.filter(reqs => reqs.id == req.body.id)[0]
        let userTo = db.users.filter(y => y.id == request.to)[0]
        let userFrom = db.users.filter(z => z.id == request.from)[0]

        let index = db.requests.findIndex(x => x.id == req.body.id)
        db.requests.splice(index, 1)

        const date = new Date()

        userTo.history.push({
            "type": "DECLINE_TRANSFER",
            "from": userFrom.id,
            "value": parseFloat(request.value),
            "timestamp": date.toLocaleString()
        })

        userFrom.history.push({
            "type": "TRANSFER_FAILED",
            "to": userTo.id,
            "value": parseFloat(request.value),
            "timestamp": date.toLocaleString()
        })

        fs.writeFileSync("db.json", JSON.stringify(db, null, 2));

        delete require.cache[require.resolve(fileName)]   // Deleting loaded module
        db = require(fileName);

        res.json({"status": 200})    
    }
})

// Login
router.get("/login", (req, res) => {
    res.render('user/login')
})

// Logout
router.post("/logout", (req, res) => {
    console.log(req.session.user.name + " logged out")
    req.session.destroy((err) => {
        if (err) {
            console.log(err)
        }
        res.json({status: "success"})
    })
})

// Sign Up
router.get('/signup', (req, res) => {
    res.render("user/signup")
})

// Dynamic Routes
router.route("/:id").get((req, res) => {
    let user = db.users.filter(u => u.id == req.params.id)[0]
    if(!user) {
        res.redirect("../404")
    } else {
        if (user.rank == "admin") {
            res.redirect("../404")
        } else {
            let new_user = JSON.clone(user)
            delete new_user.password
            delete new_user.email
            delete new_user.history
            res.send(new_user)
        }
    }
})

module.exports = router;