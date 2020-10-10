const { Conflux, Drip, format } = require('../../src');
const { MockProvider } = require('../../mock');

const PRIVATE_KEY = '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const ADDRESS = '0x0123456789012345678901234567890123456789';
const PASSWORD = 'password';

// ----------------------------------------------------------------------------
const conflux = new Conflux({});
conflux.provider = new MockProvider();
const account = conflux.wallet.addPrivateKey(PRIVATE_KEY);

test('sendTransaction error', async () => {
  await expect(conflux.sendTransaction()).rejects.toThrow('Cannot read property');
  await expect(conflux.sendTransaction({})).rejects.toThrow('not match hex');
});

test('sendTransaction remote', async () => {
  const call = jest.spyOn(conflux.provider, 'call');

  expect(conflux.wallet.has(ADDRESS)).toEqual(false);
  await conflux.sendTransaction({
    from: ADDRESS,
    gasPrice: 10,
    gas: format.bigUInt(1024),
    storageLimit: format.bigUInt(2048),
  }, PASSWORD);

  expect(call).toHaveBeenLastCalledWith('cfx_sendTransaction', {
    from: ADDRESS,
    gasPrice: '0xa',
    gas: '0x400',
    storageLimit: '0x800',
  }, PASSWORD);

  call.mockRestore();
});

test('sendTransaction local', async () => {
  const call = jest.spyOn(conflux.provider, 'call');

  await conflux.sendTransaction({
    from: account,
    to: account,
    nonce: 100,
    gasPrice: 10,
    gas: format.bigUInt(1024),
    value: 0,
    storageLimit: format.bigUInt(2048),
    epochHeight: 1000,
    chainId: 1,
    data: undefined,
  });

  expect(call).toHaveBeenLastCalledWith('cfx_sendRawTransaction', '0xf867e3640a820400941cad0b19bb29d4674531d6f115237e16afce377c808208008203e8018080a07408093a0a059d285f8b064e41ebca856c5c2369af32ebcdadb0b5e2446d9eaea043624cf0731d4ad618ef055a95cef1e05708b7b45e675205be9d050581820afc');

  call.mockRestore();
});

test('sendTransaction auto', async () => {
  const getNextNonce = jest.spyOn(conflux, 'getNextNonce');
  getNextNonce.mockReturnValue(100);

  const getStatus = jest.spyOn(conflux, 'getStatus');
  getStatus.mockReturnValue({ chainId: format.uInt(1) });

  const getEpochNumber = jest.spyOn(conflux, 'getEpochNumber');
  getEpochNumber.mockReturnValue(1000);

  const getGasPrice = jest.spyOn(conflux, 'getGasPrice');
  getGasPrice.mockReturnValue(Drip.fromDrip(10));

  const estimateGasAndCollateral = jest.spyOn(conflux, 'estimateGasAndCollateral');
  estimateGasAndCollateral.mockReturnValue({
    gasUsed: format.bigUInt(1024),
    storageCollateralized: format.bigUInt(2048),
  });

  const call = jest.spyOn(conflux.provider, 'call');
  const signTransaction = jest.spyOn(account, 'signTransaction');

  await conflux.sendTransaction({
    from: account.address,
    to: account.address,
  });
  expect(getNextNonce).toHaveBeenCalledTimes(1);
  expect(getStatus).toHaveBeenCalledTimes(1);
  expect(getEpochNumber).toHaveBeenCalledTimes(1);
  expect(getGasPrice).toHaveBeenCalledTimes(1);
  expect(estimateGasAndCollateral).toHaveBeenCalledTimes(0);
  expect(signTransaction).toHaveBeenLastCalledWith({
    chainId: 1,
    epochHeight: 1000,
    from: account.address,
    to: account.address,
    gas: 21000,
    gasPrice: '10',
    nonce: 100,
    storageLimit: 0,
  });

  await conflux.sendTransaction({
    from: account.address,
    data: '0xabcd',
  });
  expect(getNextNonce).toHaveBeenCalledTimes(2);
  expect(getStatus).toHaveBeenCalledTimes(2);
  expect(getEpochNumber).toHaveBeenCalledTimes(2);
  expect(getGasPrice).toHaveBeenCalledTimes(2);
  expect(estimateGasAndCollateral).toHaveBeenCalledTimes(1);
  expect(signTransaction).toHaveBeenLastCalledWith({
    chainId: 1,
    epochHeight: 1000,
    from: account.address,
    gas: format.bigUInt(1024),
    gasPrice: '10',
    nonce: 100,
    storageLimit: format.bigUInt(2048),
    data: '0xabcd',
  });

  signTransaction.mockRestore();
  call.mockRestore();
  estimateGasAndCollateral.mockRestore();
  getGasPrice.mockRestore();
  getEpochNumber.mockRestore();
  getStatus.mockRestore();
  getNextNonce.mockRestore();
});