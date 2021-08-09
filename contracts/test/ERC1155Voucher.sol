// SPDX-License-Identifier: MIT
pragma solidity ^0.8.1;

import "./ERC1155.sol";

contract ERC1155Voucher is ERC1155 {
    uint256 public constant PRIZE_ID = 0;

    constructor() ERC1155("https://aavegotchi.com/baazaar/raffle-prize-{id}") {
        _mint(msg.sender, PRIZE_ID, 10**20, "");
    }

    function burn(
        address account,
        uint256 id,
        uint256 value
    ) public virtual {
        require(
            account == msg.sender || isApprovedForAll(account, msg.sender),
            "ERC1155: caller is not owner nor approved"
        );

        _burn(account, id, value);
    }

    function burnBatch(
        address account,
        uint256[] memory ids,
        uint256[] memory values
    ) public virtual {
        require(
            account == msg.sender || isApprovedForAll(account, msg.sender),
            "ERC1155: caller is not owner nor approved"
        );

        _burnBatch(account, ids, values);
    }
}