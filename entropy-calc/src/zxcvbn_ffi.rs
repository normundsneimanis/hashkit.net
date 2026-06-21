use std::ffi::CString;
use std::os::raw::{c_char, c_double};

#[repr(C)]
pub struct ZxcMatch {
    _begin: i32,
    _length: i32,
    _entropy: c_double,
    _mlt_enpy: c_double,
    _type: i32,
    _next: *mut ZxcMatch,
}

unsafe extern "C" {
    fn ZxcvbnMatch(
        passwd: *const c_char,
        user_dict: *const *const c_char,
        info: *mut *mut ZxcMatch,
    ) -> c_double;
}

pub fn zxcvbn_match(password: &str, user_dict: &[String]) -> f64 {
    let password_c = CString::new(password).expect("password contains interior null byte");
    let dict_cstrings: Vec<CString> = user_dict
        .iter()
        .map(|word| CString::new(word.as_str()).expect("dictionary word contains interior null byte"))
        .collect();

    let mut dict_ptrs: Vec<*const c_char> = dict_cstrings.iter().map(|s| s.as_ptr()).collect();
    dict_ptrs.push(std::ptr::null());

    unsafe {
        ZxcvbnMatch(
            password_c.as_ptr(),
            if dict_ptrs.len() > 1 {
                dict_ptrs.as_ptr()
            } else {
                std::ptr::null()
            },
            std::ptr::null_mut(),
        )
    }
}
