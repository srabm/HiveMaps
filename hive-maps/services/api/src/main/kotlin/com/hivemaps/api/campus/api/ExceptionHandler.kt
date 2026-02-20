package com.hivemaps.api.campus.api

import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.ControllerAdvice
import org.springframework.web.bind.annotation.ExceptionHandler

@ControllerAdvice
class ExceptionHandler {

    @ExceptionHandler(IllegalArgumentException::class)
    fun handleIllegalArgument(e: IllegalArgumentException): ResponseEntity<Any> {
        return ResponseEntity.badRequest().body(mapOf("error" to e.message))
    }

    @ExceptionHandler(Exception::class)
    fun handleGeneral(e: Exception): ResponseEntity<Any> {
        return ResponseEntity.internalServerError().body(mapOf("error" to "Something went wrong"))
    }
}