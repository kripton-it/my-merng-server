const { AuthenticationError, UserInputError } = require('apollo-server');

const Post = require('../../models/Post');
const checkAuth = require('../../util/check-auth');

module.exports = {
  Query: {
    getPosts: async () => {
      try {
        const posts = await Post.find().sort({ createdAt: -1 });
        return posts;
      } catch (err) {
        throw new Error(err);
      }
    },
    getPost: async (_parent, { postId }) => {
      try {
        const post = await Post.findById(postId);

        if (post) return post;

        throw new Error('Post not found');
      } catch (err) {
        throw new Error(err);
      }
    }
  },
  Mutation: {
    createPost: async (_parent, { body }, context) => {
      const user = checkAuth(context);

      if (body.trim() === '') {
        throw new Error('Post body must not be empty');
      }

      const newPost = new Post({
        body,
        user: user.id,
        username: user.username,
        createdAt: new Date().toISOString()
      });

      const post = await newPost.save();
      context.pubsub.publish('NEW_POST', { newPost: post });
      
      return post;
    },
    deletePost: async (_parent, { postId }, context) => {
      const post = await Post.findById(postId);
      if (post) {
        const user = checkAuth(context);
        if (user.username !== post.username) {
          throw new AuthenticationError('Action not allowed');
        } else {
          await post.delete();
          return 'Post deleted successfully';
        }
      } else {
        throw new UserInputError('Post not found');
      }
    },
    likePost: async (_parent, { postId }, context) => {
      const post = await Post.findById(postId);

      if (post) {
        const { username } = checkAuth(context);
        const targetLike = post.likes.find(like => like.username === username);

        if (targetLike) {
          // post already liked, unlike it
          post.likes = post.likes.filter(like => like.username !== username);
        } else {
          // not liked, like it
          const newLike = {
            username,
            createdAt: new Date().toISOString()
          };
          post.likes = [...post.likes, newLike];
        }

        await post.save();

        return post;
      } else {
        throw new UserInputError('Post not found');
      }
    }
  },
  Subscription: {
    newPost: {
      subscribe: (_parent, _args, { pubsub }) => pubsub.asyncIterator('NEW_POST')
    }
  }
};