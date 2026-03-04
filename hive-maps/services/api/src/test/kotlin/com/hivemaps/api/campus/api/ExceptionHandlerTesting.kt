package com.hivemaps.api.campus.api

import com.hivemaps.api.campus.domain.NoRouteFoundException
import com.hivemaps.api.campus.domain.NodeNotFoundException
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.springframework.http.HttpStatus

class ExceptionHandlerTest {

    private val handler = ExceptionHandler()

    @Test
    fun `handleIllegalArgument should return 400`() {
        val exception = IllegalArgumentException("Invalid input")

        val response = handler.handleIllegalArgument(exception)

        assertEquals(HttpStatus.BAD_REQUEST, response.statusCode)
        assertEquals(mapOf("error" to "Invalid input"), response.body)
    }

    @Test
    fun `handleIllegalArgument for a null message`() {
        val exception = IllegalArgumentException(null as String?)

        val response = handler.handleIllegalArgument(exception)

        assertEquals(HttpStatus.BAD_REQUEST, response.statusCode)
        assertEquals(mapOf("error" to null), response.body)
    }

    @Test
    fun `handleNoRouteFound should return 422`() {
        val exception = NoRouteFoundException("A1", "B2")

        val response = handler.handleNoRouteFound(exception)

        assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, response.statusCode)
        assertEquals(
            mapOf("error" to "No route found between A1 and B2"),
            response.body
        )
    }

    @Test
    fun `handleNoRouteFound with empty ids`() {
        val exception = NoRouteFoundException("", "")

        val response = handler.handleNoRouteFound(exception)

        assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, response.statusCode)
        assertEquals(
            mapOf("error" to "No route found between  and "),
            response.body
        )
    }

    @Test
    fun `handleNoNodeFound should return 404`() {
        val exception = NodeNotFoundException("Node 1 not found")

        val response = handler.handleNoNodeFound(exception)

        assertEquals(HttpStatus.NOT_FOUND, response.statusCode)
        assertEquals(
            mapOf("error" to "Node 1 not found"),
            response.body
        )
    }

    @Test
    fun `handleNoNodeFound for an empty message`() {
        val exception = NodeNotFoundException("")

        val response = handler.handleNoNodeFound(exception)

        assertEquals(HttpStatus.NOT_FOUND, response.statusCode)
        assertEquals(
            mapOf("error" to ""),
            response.body
        )
    }

    @Test
    fun `handleGeneral should return 500`() {
        val exception = RuntimeException("Unexpected")

        val response = handler.handleGeneral(exception)

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.statusCode)
        assertEquals(
            mapOf("error" to "Something went wrong"),
            response.body
        )
    }

    @Test
    fun `handleGeneral with a null message`() {
        val exception = RuntimeException(null as String?)

        val response = handler.handleGeneral(exception)

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.statusCode)
        assertEquals(
            mapOf("error" to "Something went wrong"),
            response.body
        )
    }

    @Test
    fun `handleGeneral without a message`() {
        val exception = RuntimeException()

        val response = handler.handleGeneral(exception)

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.statusCode)
        assertEquals(
            mapOf("error" to "Something went wrong"),
            response.body
        )
    }
}