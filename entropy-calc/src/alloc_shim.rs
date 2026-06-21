use std::alloc::{alloc, dealloc, Layout};
use std::cell::RefCell;
use std::collections::HashMap;

thread_local! {
    static ALLOCATIONS: RefCell<HashMap<usize, Layout>> = RefCell::new(HashMap::new());
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn entropy_malloc(size: usize) -> *mut u8 {
    if size == 0 {
        return std::ptr::null_mut();
    }

    let layout = Layout::from_size_align(size, 8).expect("invalid allocation layout");
    let ptr = unsafe { alloc(layout) };
    if ptr.is_null() {
        return ptr;
    }

    ALLOCATIONS.with(|allocs| {
        allocs.borrow_mut().insert(ptr as usize, layout);
    });
    ptr
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn entropy_free(ptr: *mut u8) {
    if ptr.is_null() {
        return;
    }

    ALLOCATIONS.with(|allocs| {
        if let Some(layout) = allocs.borrow_mut().remove(&(ptr as usize)) {
            unsafe { dealloc(ptr, layout) };
        }
    });
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn entropy_calloc(count: usize, size: usize) -> *mut u8 {
    let total = count.saturating_mul(size);
    let ptr = unsafe { entropy_malloc(total) };
    if !ptr.is_null() {
        unsafe { std::ptr::write_bytes(ptr, 0, total) };
    }
    ptr
}
