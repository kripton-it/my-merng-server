const commentsResolvers = require('./comments');
const postsResolvers = require('./posts');
const usersResolvers = require('./users');

module.exports = {
  Post: {
    commentsCount: (parent) => parent.comments.length,
    likesCount: (parent) => parent.likes.length
  },
  Query: {
    ...postsResolvers.Query
  },
  Mutation: {
    ...commentsResolvers.Mutation,
    ...postsResolvers.Mutation,
    ...usersResolvers.Mutation
  },
  Subscription: {
    ...postsResolvers.Subscription
  }
};