pub struct SequentialRng {
    values: Vec<u32>,
    index: usize,
}

impl SequentialRng {
    pub fn new(values: Vec<u32>) -> Self {
        Self { values, index: 0 }
    }

    pub fn random_uint(&mut self, limit: u32) -> u32 {
        if limit == 0 {
            return 0;
        }

        let ceil = u32::MAX - (u32::MAX % limit) - 1;
        loop {
            let value = self.values.get(self.index).copied().unwrap_or(0);
            self.index += 1;
            if value <= ceil {
                return value % limit;
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn uses_sequence_with_rejection() {
        let mut rng = SequentialRng::new(vec![100, 200]);
        assert_eq!(rng.random_uint(7), 100 % 7);
    }
}
