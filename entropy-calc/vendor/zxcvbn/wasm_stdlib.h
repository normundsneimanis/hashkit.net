#pragma once

#include <stddef.h>
#include <stdint.h>

#ifndef NULL
#define NULL ((void *)0)
#endif

#ifndef DBL_MAX
#define DBL_MAX 1.7976931348623157e+308
#endif

void *entropy_malloc(size_t size);
void entropy_free(void *ptr);
void *entropy_calloc(size_t count, size_t size);

#define malloc entropy_malloc
#define free entropy_free
#define calloc entropy_calloc

int tolower(int c);
int islower(int c);
int isupper(int c);
int isdigit(int c);
char *strchr(const char *s, int c);
size_t strlen(const char *s);
int strncmp(const char *s1, const char *s2, size_t n);
void *memchr(const void *s, int c, size_t n);
void *memset(void *s, int c, size_t n);
void *memcpy(void *dest, const void *src, size_t n);
double log(double x);
double pow(double x, double y);
