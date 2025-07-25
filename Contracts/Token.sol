// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Token is ERC20 {
    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) {
        _mint(msg.sender, 1_000_000 * 10 ** 18); // msg.sender holds 1M Tokens
    }

    // minting functionality, can be called by anyone
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
