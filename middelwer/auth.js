const express = require('express');
const jwt = require('jsonwebtoken');
const { mySqlQury } = require('../middelwer/db');
const language = require("../public/language/languages.json");

const auth = async (req, res, next) => {
    try {
        const token = req.cookies.webtoken;

        if (!token) {
            req.flash("error", "You are not authorized, please login first.");
            return res.redirect('/');
        }

        const decode = jwt.verify(token, process.env.TOKEN_KEY);
        req.user = decode;

        const lang = req.cookies.lang;
        if (lang) {
            try {
                const decode_lang = jwt.verify(lang, process.env.TOKEN);
                req.lang = decode_lang;

                const langCode = decode_lang.lang;
                if (language[langCode]) {
                    req.language_data = language[langCode];
                    req.language_name = langCode;
                } else {
                    req.language_data = language.en;
                    req.language_name = 'en';
                }
            } catch (langErr) {
                // If language token is invalid, default to English
                req.language_data = language.en;
                req.language_name = 'en';
            }
        } else {
            req.language_data = language.en;
            req.language_name = 'en';
        }

        next();
    } catch (err) {
        // Token expired, tampered, or invalid
        res.clearCookie('webtoken');
        req.flash("error", "Session expired. Please login again.");
        return res.redirect('/');
    }
};

module.exports = auth;