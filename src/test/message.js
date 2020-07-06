require('dotenv').config()
const app = require('../server.js')
const mongoose = require('mongoose')
const chai = require('chai')
const chaiHttp = require('chai-http')
// const assert = chai.assert
const mocha = require('mocha')

const User = require('../models/user.js')
const Message = require('../models/message.js')

chai.config.includeStack = true

const expect = chai.expect
// const should = chai.should()
const describe = mocha.describe
const it = mocha.it
const after = mocha.after
const beforeEach = mocha.beforeEach
const afterEach = mocha.afterEach
chai.use(chaiHttp)

/**
 * root level hooks
 */
after((done) => {
  // required because https://github.com/Automattic/mongoose/issues/1251#issuecomment-65793092
  mongoose.models = {}
  mongoose.modelSchemas = {}
  mongoose.connection.close()
  done()
})

const SAMPLE_OBJECT_ID_1 = 'aaaaaaaaaaaa' // 12 byte string
const SAMPLE_OBJECT_ID_2 = 'bbbbbbbbbbbb' // 12 byte string

describe('Message API endpoints', () => {
  beforeEach((done) => {
    const sampleUser = new User({
      username: 'myuser',
      password: 'mypassword',
      _id: SAMPLE_OBJECT_ID_1
    })

    const sampleMessage = new Message({
      title: 'mymessage',
      body: 'this is a message',
      author: SAMPLE_OBJECT_ID_1,
      _id: SAMPLE_OBJECT_ID_2
    })

    Promise.all([sampleUser.save(), sampleMessage.save()])
      .then(() => {
        done()
      })
  })

  afterEach((done) => {
    const deleteUser = User.deleteMany({ username: ['myuser'] })
    const deleteMessage = Message.deleteMany({ _id: [SAMPLE_OBJECT_ID_2] })

    Promise.all([deleteUser, deleteMessage])
      .then(() => {
        done()
      })
  })

  it('should load all messages', (done) => {
    chai.request(app)
      .get('/messages')
      .end((err, res) => {
        if (err) { done(err) }
        expect(res).to.have.status(200)
        expect(res.body.messages).to.be.an('array')
        done()
      })
  })

  it('should get one specific message', (done) => {
    chai.request(app)
      .get(`/messages/${SAMPLE_OBJECT_ID_2}`)
      .end((err, res) => {
        if (err) { done(err) }
        expect(res).to.have.status(200)
        expect(res.body).to.be.an('object')
        expect(res.body.title).to.equal('mymessage')
        expect(res.body.body).to.equal('this is a message')
        expect(res.body.author).to.be.a('string')
        done()
      })
  })

  it('should post a new message', (done) => {
    chai.request(app)
      .post('/messages')
      .send({ title: 'anothermessage', body: 'another body', author: SAMPLE_OBJECT_ID_1 })
      .end((err, res) => {
        if (err) { done(err) }
        expect(res.body).to.be.an('object')
        expect(res.body).to.have.property('title', 'anothermessage')

        // check that message is actually inserted into database
        Message.findOne({ title: 'anothermessage' }).then(message => {
          expect(message).to.be.an('object')
          done()
        })
      })
  })

  it('should update a message', (done) => {
    chai.request(app)
      .put(`/messages/${SAMPLE_OBJECT_ID_2}`)
      .send({ title: 'anothermessage' })
      .end((err, res) => {
        if (err) { done(err) }
        expect(res.body.message).to.be.an('object')
        expect(res.body.message).to.have.property('title', 'anothermessage')

        // check that message is actually inserted into database
        Message.findOne({ title: 'anothermessage' }).then(message => {
          expect(message).to.be.an('object')
          done()
        })
      })
  })

  it('should delete a message', (done) => {
    chai.request(app)
      .delete(`/messages/${SAMPLE_OBJECT_ID_2}`)
      .end((err, res) => {
        if (err) { done(err) }
        expect(res.body.message).to.equal('Successfully deleted.')
        expect(res.body._id).to.equal(SAMPLE_OBJECT_ID_2)

        // check that message is actually deleted from database
        Message.findOne({ title: 'mymessage' }).then(message => {
          expect(message).to.equal(null)
          done()
        })
      })
  })
})
