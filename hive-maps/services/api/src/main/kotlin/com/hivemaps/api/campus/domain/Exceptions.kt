package com.hivemaps.api.campus.domain

class NoRouteFoundException(startNodeId: String, endNodeId: String) 
    : RuntimeException("No route found between $startNodeId and $endNodeId")

class NodeNotFoundException(message: String) 
    : RuntimeException(message)