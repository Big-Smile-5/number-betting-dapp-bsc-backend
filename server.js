
const express = require('express')
const app = express()
const server = require('http').createServer(app)

require('dotenv').config()

/*const io = require('socket.io')(server, {
    cors: {
        origin: "http://localhost:3000",
    }
})*/
const port = process.env.PORT || 5000

const Web3 = require('web3')
const contractData = require('../client/src/contract.json')
const EthereumTx = require('ethereumjs-tx');

const adminPublicKey = process.env.PUBLICKEY
const infuraUrl = process.env.INFURA_URL
const adminPrivateKey = process.env.PRIVATEKEY

const bodyParser = require('body-parser')

let timestamp = 0, isTransactionProcessing = 0

server.listen(port, async () => {
    console.log(`Listening on port ${port}`)
})

app.use(express.json())
app.use(bodyParser.json())

const web3 = new Web3(new Web3.providers.HttpProvider(infuraUrl))
const contract = new web3.eth.Contract(
    contractData.RNB.abi,
    contractData.RNB.address
)

const scanContract = async () => {
    try {
        let bettingState = await contract.methods.getBettingState().call()

        bettingState = parseInt(bettingState)
        
		if(timestamp == 0) {
			timestamp = await contract.methods.getEndTime().call()
			console.log(timestamp)
		}
		let currentTime = new Date()
		let currentTimestamp = currentTime.getTime() / 1000 //+ currentTime.getTimezoneOffset() * 60
		let dif = timestamp - currentTimestamp

		console.log(dif)
		console.log(bettingState)

		if(dif >= 0) return;
		if(isTransactionProcessing == 1) return
		
		isTransactionProcessing = 1;

		if(bettingState == 1) {
			console.log("Trying to stop betting...")
			let data =await contract.methods.stopBetting().encodeABI();

			web3.eth.getTransactionCount(adminPublicKey).then(function (lastCountOfTransaction) {
				var txdetail = {
					from: adminPublicKey,
					to: contractData.RNB.address,
					gasPrice: web3.utils.toHex(10 * 1e9),
					gasLimit: web3.utils.toHex(210000),
					data: data,
					nonce: web3.utils.toHex(lastCountOfTransaction)
				}
		
				const privateKey1Buffer = new Buffer.from(adminPrivateKey, 'hex')
		
				const transaction = new EthereumTx(txdetail);
				transaction.sign(privateKey1Buffer);
				const serializedTransaction = transaction.serialize();
			
				try {
					web3.eth.sendSignedTransaction('0x' + serializedTransaction.toString('hex'), (err, res) => {
						if(err) {
							console.log("error1")
							console.log(err)
						}
					}).on('receipt', async () => {
						timestamp = await contract.methods.getEndTime().call()
						isTransactionProcessing = 0
						console.log("it stopped")
					}).on('error', () => {
						isTransactionProcessing = 0;
					})
				} catch (e) {
					console.log("sendSignedTransaction error : ", e);
					isTransactionProcessing = 0;
				}
			});
		}
		else if(bettingState == 2) {
			console.log("Trying to start betting...")

			let data =await contract.methods.startBetting().encodeABI();

			web3.eth.getTransactionCount(adminPublicKey).then(async (lastCountOfTransaction) => {
				var txdetail = {
					from: adminPublicKey,
					to: contractData.RNB.address,
					gasPrice: web3.utils.toHex(10 * 1e9),
					gasLimit: web3.utils.toHex(210000),
					data: data,
					nonce: web3.utils.toHex(lastCountOfTransaction)
				}
		
				const privateKey1Buffer = Buffer.from(adminPrivateKey, 'hex')
				const transaction = new EthereumTx(txdetail);
				transaction.sign(privateKey1Buffer);
				const serializedTransaction = transaction.serialize();
			
				try {
					web3.eth.sendSignedTransaction('0x' + serializedTransaction.toString('hex'), (err, res) => {
						if(err) {
							console.log("error2")
							console.log(err)
						}
					}).on('receipt', async () => {
						timestamp = await contract.methods.getEndTime().call()
						isTransactionProcessing = 0;
						console.log("it restarted")
					}).on('error', () => {
						isTransactionProcessing = 0;
					})
				} catch (e) {
					console.log("sendSignedTransaction error : ", e);
					isTransactionProcessing = 0;
				}
			})
		}
    }catch(e) {
        console.log(e)
    }
}

setInterval(async () => {
    await scanContract()
}, 1000)

/*io.on('connection', (socket) => {
    let bettingData = require('./data.json')
    socket.emit('connection', bettingData)
})

app.post('/api/bet', async (req, res) => {
    const provider = new Provider(privateKey, infuraUrl);
    const web3 = new Web3(provider)
    const networkId = await web3.eth.net.getId()
    const contract = new web3.eth.Contract(
        contractData.abi,
        contractData.networks[networkId].address
    )

    let bettingData = require('./data.json')
    bettingData.totalBettedAmount += req.body.bettedAmount

    contract.methods.countOfUser().call()
    .then((count) => {
        bettingData.currentBet = count
        fs.writeFile(__dirname + '/data.json', JSON.stringify(bettingData), (err, data) => {
            if(err) {
                return console.log("err")
            }
            else {
                io.emit('updateState', bettingData)
                res.send({
                    status: 'success',
                })
            }
        })
    })
})*/
