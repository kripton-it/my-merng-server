const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { UserInputError } = require('apollo-server');

const { SECRET_KEY } = require('../../config');
const User = require('../../models/User');
const { validateLoginInput, validateRegisterInput } = require('../../util/validators');

const getToken = (user) => {
  return jwt.sign({
    id: user.id,
    email: user.email,
    username: user.username
  }, SECRET_KEY, { expiresIn: '1h' });
}

module.exports = {
  Query: {
    getUsers: async () => {
      try {
        const users = await User.find();
        return users;
      } catch(err) {
        throw new Error(err);
      }
    }
  },
  Mutation: {
    login: async (_parent, { username, password }, _context, _info) => {
      // 1: Validate user data
      const { errors, valid } = validateLoginInput(username, password);
      if (!valid) {
        throw new UserInputError('Validation errors', { errors });
      }
      // 2: Make sure user already exists
      const user = await User.findOne({ username });
      if (!user) {
        errors.general = 'User with this username doesn\'t exist';
        throw new UserInputError('User with this username doesn\'t exist', { errors });
      }

      const isPasswordCorrect = await bcrypt.compare(password, user.password);
      if (!isPasswordCorrect) {
        errors.general = 'Wrong password';
        throw new UserInputError('Wrong password', { errors });
      }

      return {
        ...user._doc,
        id: user._id,
        token: getToken(user)
      };
    },
    register: async (_parent, { registerInput }, _context, _info) => {
      const { confirmPassword, email, password, username } = registerInput
      // 1: Validate user data
      const { errors, valid } = validateRegisterInput(username, email, password, confirmPassword);
      if (!valid) {
        throw new UserInputError('Validation errors', { errors });
      }
      // 2: Make sure user doesn't already exist
      const user = await User.findOne({ username });
      if (user) {
        throw new UserInputError('Username is already taken', {
          errors: {
            username: 'Username is already taken'
          }
        });
      }
      // 3: hash password and create an auth token
      const hashPassword = await bcrypt.hash(password, 12);

      const newUser = new User({
        email,
        username,
        password: hashPassword,
        createdAt: new Date().toISOString()
      });

      const res = await newUser.save();

      return {
        ...res._doc,
        id: res._id,
        token: getToken(res)
      };
    }
  }
};