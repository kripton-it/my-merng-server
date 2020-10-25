const { AuthenticationError, UserInputError } = require('apollo-server');

const Post = require('../../models/Post');
const checkAuth = require('../../util/check-auth');
const { validateComment } = require('../../util/validators');

module.exports = {
  Mutation: {
    createComment: async (_parent, { body, postId }, context) => {
      const post = await Post.findById(postId);
      if (post) {
        const { username } = checkAuth(context);
        const { errors, valid } = validateComment(body);
        if (!valid) {
          throw new UserInputError('Invalid comment', { errors });
        }
        const newComment = {
          body,
          username,
          createdAt: new Date().toISOString()
        };
        const { comments } = post;
        post.comments = [newComment, ...comments];
        await post.save();
        return post;
      } else {
        throw new UserInputError('Post not found');
      }
    },
    deleteComment: async (_parent, { postId, commentId }, context) => {
      const post = await Post.findById(postId);
      if (post) {
        const { username } = checkAuth(context);
        const { comments } = post;
        const targetComment = comments.find(comment => comment.id === commentId);

        if (!targetComment) {
          throw new UserInputError('Comment not found');
        }

        if (username !== targetComment.username) {
          throw new AuthenticationError('Action not allowed');
        }

        post.comments = comments.filter(comment => comment.id !== commentId);
        await post.save();
        return post;
      } else {
        throw new UserInputError('Post not found');
      }
    }
  }
};