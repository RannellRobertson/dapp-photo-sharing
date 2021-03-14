const { assert } = require('chai');
const Web3 = require('web3');
const web3 = new Web3('http://localhost:7545');

const Decentragram = artifacts.require('./Decentragram.sol');

require('chai')
  .use(require('chai-as-promised'))
  .should();

contract('Decentragram', ([depolyer, author, tipper]) => {
    let decentragram;

    before(async () => {
        decentragram = await Decentragram.deployed();
    });

    describe('deployment', async () => {
        it('deploys successfully', async () => {
            const address = decentragram.address;
            assert.notEqual(address, 0x0);
            assert.notEqual(address, '');
            assert.notEqual(address, null);
            assert.notEqual(address, undefined);
        });

        it('has a name', async () => {
            const name = await decentragram.name();
            assert.equal(name, "Decentragram");
        });
    });

    describe('images', async () => {
        let result, imageCount;
        const hash = 'cffe31cdf6529028f56d7ce25cf282a7b90c6e0d56d10a8e2da0092c507a7806'

        before(async () => {
            result = await decentragram.uploadImage(hash, "Image description", { from: author });
            imageCount = await decentragram.imageCount();
        });

        it('creates image', async () => {
            // SUCCESS
            assert.equal(imageCount, 1);
            const event = result.logs[0].args;
            
            assert.equal(event.id.toNumber(), imageCount.toNumber(), 'Id is correct');
            assert.equal(event.hash, hash, 'Hash is correct');
            assert.equal(event.description, 'Image description', 'description is correct');
            assert.equal(event.tipAmount, '0', 'Tip amount is correct');
            assert.equal(event.author, author, 'Author is correct');

            // FAILURE: Image must have hash
            await decentragram.uploadImage('', 'Image description', { from: author }).should.be.rejected;
            
            // FAILURE: Image must have description
            await decentragram.uploadImage('Image hash', '', { from: author }).should.be.rejected;
        });

        it('list images', async () => {
            const image = await decentragram.images(imageCount);

            assert.equal(image.id.toNumber(), imageCount.toNumber(), 'Id is correct');
            assert.equal(image.hash, hash, 'Hash is correct');
            assert.equal(image.description, 'Image description', 'description is correct');
            assert.equal(image.tipAmount, '0', 'Tip amount is correct');
            assert.equal(image.author, author, 'Author is correct');

        });

        it('allows users to tip image', async () => {
            // Track the author balance before purchase
            let oldAuthorBalance
            oldAuthorBalance = await web3.eth.getBalance(author);
            oldAuthorBalance = new web3.utils.BN(oldAuthorBalance);

            result = await decentragram.tipImageOwner(imageCount, { from: tipper, value: web3.utils.toWei('1', 'ether') });

            // SUCCESS
            const event = result.logs[0].args;
            
            assert.equal(event.id.toNumber(), imageCount.toNumber(), 'Id is correct');
            assert.equal(event.hash, hash, 'Hash is correct');
            assert.equal(event.description, 'Image description', 'description is correct');
            assert.equal(event.tipAmount, '1000000000000000000', 'Tip amount is correct');
            assert.equal(event.author, author, 'Author is correct');

            //Check that author recieved funds
            let newAuthorBalance;
            newAuthorBalance = await web3.eth.getBalance(author);
            newAuthorBalance = new web3.utils.BN(newAuthorBalance);

            let tipImageOwner;
            tipImageOwner =  web3.utils.toWei('1', 'ether');
            tipImageOwner = new web3.utils.BN(tipImageOwner);

            const expectedBalance = oldAuthorBalance.add(tipImageOwner);
            assert.equal(newAuthorBalance.toString(), expectedBalance.toString());

            // FAILURE: Tries to tip a image that doesn't exist
            await decentragram.tipImageOwner(99, { from: tipper, value: web3.utils.toWei('1', 'ether') }).should.be.rejected;
        });
    });
});
