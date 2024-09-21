// config/passport.js
const passport = require("passport");
const AppleStrategy = require("passport-apple");
const GoogleStrategy = require("passport-google-oauth20");
const KakaoStrategy = require("passport-kakao").Strategy;
const User = require("../models/User");
require("dotenv").config({ path: "./config/.env" });

// Apple 로그인 전략
passport.use(
  new AppleStrategy(
    {
      clientID: process.env.APPLE_CLIENT_ID,
      teamID: process.env.APPLE_TEAM_ID,
      keyID: process.env.APPLE_KEY_ID,
      privateKey: process.env.APPLE_PRIVATE_KEY.replace(/\\n/g, "\n"), // 개행 처리
      callbackURL: "/auth/apple/callback",
      scope: ["name", "email"],
    },
    async (accessToken, refreshToken, profile, done) => {
      let email = profile.email;
      if (!email) {
        email = `${profile.id}@noemail.com`; // 이메일이 없을 경우 profile.id로 대체
      }
      try {
        console.log("APPLE_CLIENT_ID:", process.env.APPLE_CLIENT_ID);
        let user = await User.findOne({ appleId: profile.id });
        if (!user) {
          user = await User.create({
            appleId: profile.id,
            email, // 생성 시 이메일을 저장
          });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

// Google 로그인 전략
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
      scope: ["profile", "email"],
    },
    async (accessToken, refreshToken, profile, done) => {
      let email = profile.emails ? profile.emails[0].value : null;
      if (!email) {
        email = `${profile.id}@noemail.com`; // 이메일이 없을 경우 profile.id로 대체
      }
      try {
        let user = await User.findOne({ googleId: profile.id });
        if (!user) {
          user = await User.create({
            googleId: profile.id,
            email, // 생성 시 이메일을 저장
          });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

// Kakao 로그인 전략
passport.use(
  new KakaoStrategy(
    {
      clientID: process.env.KAKAO_REST_API_KEY,
      callbackURL: "/auth/kakao/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      let email = profile._json.kakao_account.email;
      if (!email) {
        email = `${profile.id}@noemail.com`; // 이메일이 없을 경우 profile.id로 대체
      }
      try {
        let user = await User.findOne({ kakaoId: profile.id });
        if (!user) {
          user = await User.create({
            kakaoId: profile.id,
            email, // 생성 시 이메일을 저장
          });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

// 직렬화 & 역직렬화
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});
