# @reddotlabs/multicall

Lightweight JS library to interact with multicall contracts, original by MakerDAO.

Multicall allows multiple smart contract constant function calls to be grouped into a single call and the results aggregated into a single result. This reduces the number of separate JSON RPC requests that need to be sent over the network. In case of aggregation failure, it will switch to single call in parallel.
