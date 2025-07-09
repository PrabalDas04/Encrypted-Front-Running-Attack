// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Dex {
    address public tokenA;
    address public tokenB;

    uint256 public reserveA;
    uint256 public reserveB;

    constructor(address _tokenA, address _tokenB) {
        tokenA = _tokenA;
        tokenB = _tokenB;
    }

    function _updateReserves() internal {
        reserveA = IERC20(tokenA).balanceOf(address(this));
        reserveB = IERC20(tokenB).balanceOf(address(this));
    }

    // function for swapping tokens
    function swap(address tokenIn, uint256 amountIn) external {
        require(tokenIn == tokenA || tokenIn == tokenB, "Invalid tokenIn");

        address tokenOut = tokenIn == tokenA ? tokenB : tokenA;

        // Pull tokenIn from sender
        require(IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn), "Transfer failed");

        // Get balances after transfer
        uint256 balanceA = IERC20(tokenA).balanceOf(address(this));
        uint256 balanceB = IERC20(tokenB).balanceOf(address(this));

        // Compute reserves before this swap
        uint256 reserveIn = tokenIn == tokenA ? balanceA - amountIn : balanceB - amountIn;
        uint256 reserveOut = tokenIn == tokenA ? balanceB : balanceA;

        // Apply 0.3% fee and compute the output(UniswapV2)
        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = reserveIn * 1000 + amountInWithFee;
        uint256 amountOut = numerator / denominator;

        // checking condition for 0 output
        require(amountOut > 0, "Insufficient output amount");

        // Transfer tokenOut to user
        require(IERC20(tokenOut).transfer(msg.sender, amountOut), "Transfer out failed");

        // Update reserves
        _updateReserves();
    }


    // Allow users to add liquidity (basic version)
    function addLiquidity(uint256 amountA, uint256 amountB) external {
        require(IERC20(tokenA).transferFrom(msg.sender, address(this), amountA), "TokenA transfer failed");
        require(IERC20(tokenB).transferFrom(msg.sender, address(this), amountB), "TokenB transfer failed");

        _updateReserves();
    }
}
