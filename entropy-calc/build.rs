fn main() {
    let target = std::env::var("TARGET").unwrap();
    let mut build = cc::Build::new();

    build.file("vendor/zxcvbn/zxcvbn.c").include("vendor/zxcvbn");

    if target.contains("wasm32") {
        build.file("vendor/zxcvbn/wasm_libc.c");
        build.define("ZXCVBN_WASM", None);
        build.flag("-nostdlib");
        build.compiler("vendor/zxcvbn/zig-cc.sh");
        build.archiver("zig");
        build.ar_flag("ar");
    }

    build.compile("zxcvbn");
}
