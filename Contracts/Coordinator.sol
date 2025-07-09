// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IMintableToken {
    function mint(address to, uint256 amount) external;
}

contract Coordinator {
    // public mempool for storing encrypted txs
    struct EncryptedTx {
        address sender;
        bytes ciphertext;
    }

    // public mempool for storing decrypted txs
    struct DecryptedTx {
        address targetAddress;
        bytes payload;
    }

    EncryptedTx[] public encryptedTxs;
    DecryptedTx[] public decryptedTxs;

    // deposit function
    function deposit(address tokenAddress) external payable {
        uint256 mintAmount = msg.value * 100; // 1ETH = 100 Tokens
        IMintableToken(tokenAddress).mint(msg.sender, mintAmount); // This mints tokens directly to sender
    }

    function submitEncryptedTx(bytes calldata data) external {
        encryptedTxs.push(EncryptedTx(msg.sender, data));
    }

    function submitDecryptedTx(address addr, bytes calldata payload) external {
        decryptedTxs.push(DecryptedTx({
            targetAddress: addr,
            payload: payload
        }));
    }

    function getEncryptedTxs() external view returns (EncryptedTx[] memory) {
        return encryptedTxs;
    }

    function encryptedTxCount() external view returns (uint) {
        return encryptedTxs.length;
    }

    function decryptedTxCount() external view returns (uint) {
        return decryptedTxs.length;
    }

    function getEncryptedTx(uint i) external view returns (address, bytes memory) {
        EncryptedTx storage encTx = encryptedTxs[i];
        return (encTx.sender, encTx.ciphertext);
    }

    function getDecryptedTx(uint i) external view returns (address, bytes memory) {
        DecryptedTx storage decTx = decryptedTxs[i];
        return (decTx.targetAddress, decTx.payload);
    }
}
