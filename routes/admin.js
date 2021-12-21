const express = require("express");
const router = express.Router();
const { users } = require('../db.json')

const fs = require('fs')

const fileName = "../db.json"
let db = require(fileName)

const argon2 = require('argon2');
const { randomUUID } = require('crypto')

router.get("/", (req, res) => {
    res.render("admin/auth")
})

router.post("/main", (req, res) => {
    let user = db.users.filter(user => user.name === req.body.username)[0];

    if (req.body.username.length == 0 && req.body.password.length == 0) {
        res.render('admin/auth', {username: req.body.username, password: req.body.password, error: "The forms cannot be empty!"})
    } else if (!user) {
        res.render('admin/auth', {username: req.body.username, password: req.body.password, error: "Invalid username."})
    } else if (req.body.password.length == 0) {
        res.render('admin/auth', {username: req.body.username, password: req.body.password, error: "Password can't be 0 characters!"})
    } else if (user.rank != "admin") {
        res.render('admin/auth', {username: req.body.username, password: req.body.password, error: "This user does not have admin privileges."})
    } else {
        (async () => {
            let pass = await argon2.verify(user.password, req.body.password);
            if (pass === true) {
                console.log(user.name + ' logged in as admin')
                res.render("admin/main", {users: users})
            } else {
                res.render('/auth', {username: req.body.username, password: req.body.password, error: "Invalid Password!"})
            }
        })();  
    }
})

module.exports = router;