#include "wasm_stdlib.h"

int tolower(int c)
{
    if (c >= 'A' && c <= 'Z') {
        return c + ('a' - 'A');
    }
    return c;
}

int islower(int c)
{
    return c >= 'a' && c <= 'z';
}

int isupper(int c)
{
    return c >= 'A' && c <= 'Z';
}

int isdigit(int c)
{
    return c >= '0' && c <= '9';
}

char *strchr(const char *s, int c)
{
    char target = (char)c;
    while (*s) {
        if (*s == target) {
            return (char *)s;
        }
        ++s;
    }
    if (target == '\0') {
        return (char *)s;
    }
    return NULL;
}

size_t strlen(const char *s)
{
    const char *start = s;
    while (*s) {
        ++s;
    }
    return (size_t)(s - start);
}

int strncmp(const char *s1, const char *s2, size_t n)
{
    for (size_t i = 0; i < n; ++i) {
        unsigned char a = (unsigned char)s1[i];
        unsigned char b = (unsigned char)s2[i];
        if (a != b) {
            return (int)a - (int)b;
        }
        if (a == 0) {
            return 0;
        }
    }
    return 0;
}

void *memchr(const void *s, int c, size_t n)
{
    const unsigned char *p = (const unsigned char *)s;
    unsigned char target = (unsigned char)c;
    for (size_t i = 0; i < n; ++i) {
        if (p[i] == target) {
            return (void *)(p + i);
        }
    }
    return NULL;
}

void *memset(void *s, int c, size_t n)
{
    unsigned char *p = (unsigned char *)s;
    unsigned char value = (unsigned char)c;
    for (size_t i = 0; i < n; ++i) {
        p[i] = value;
    }
    return s;
}

void *memcpy(void *dest, const void *src, size_t n)
{
    unsigned char *d = (unsigned char *)dest;
    const unsigned char *s = (const unsigned char *)src;
    for (size_t i = 0; i < n; ++i) {
        d[i] = s[i];
    }
    return dest;
}
