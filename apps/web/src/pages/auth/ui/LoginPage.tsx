"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { isAxiosError } from "axios";
import {
  Box,
  Button,
  Flex,
  Heading,
  Input,
  Stack,
  Text,
  Icon,
} from "@chakra-ui/react";
import { Eye, EyeOff, ShoppingBag } from "lucide-react";
import { authApi, setToken } from "@/entities/auth";
import { appToaster } from "@/shared/ui/app-toaster";

interface LoginFormValues {
  email: string;
  password: string;
}

export function LoginPage(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>();

  const onSubmit = async (data: LoginFormValues): Promise<void> => {
    try {
      const res = await authApi.login(data);
      setToken(res.token);
      appToaster.create({
        type: "success",
        title: `${res.user.name}님, 환영합니다!`,
      });
      const from = searchParams?.get("from") ?? "/dashboard";
      router.push(from);
    } catch (err) {
      const msg = isAxiosError(err)
        ? (err.response?.data?.message ?? "이메일 또는 비밀번호가 올바르지 않습니다.")
        : "로그인 중 오류가 발생했습니다.";
      appToaster.create({ type: "error", title: "로그인 실패", description: msg });
    }
  };

  return (
    <Flex
      minH="100vh"
      align="center"
      justify="center"
      bg="gray.50"
      px={4}
    >
      <Box w="full" maxW="420px">
        {/* 로고 */}
        <Flex align="center" justify="center" gap={2.5} mb={8}>
          <Flex
            w={10}
            h={10}
            bg="blue.500"
            borderRadius="xl"
            align="center"
            justify="center"
            flexShrink={0}
          >
            <Icon as={ShoppingBag} color="white" boxSize={5} />
          </Flex>
          <Box>
            <Text fontSize="lg" fontWeight="bold" lineHeight="1.2">
              PassOffer
            </Text>
            <Text fontSize="xs" color="gray.400" lineHeight="1.2">
              Order Management Studio
            </Text>
          </Box>
        </Flex>

        <Box
          bg="white"
          borderRadius="2xl"
          boxShadow="0 4px 24px rgba(0,0,0,0.08)"
          borderWidth="1px"
          borderColor="gray.100"
          p={8}
        >
          <Stack gap={6}>
            <Stack gap={1}>
              <Heading size="md" fontWeight="bold">
                로그인
              </Heading>
              <Text color="gray.500" fontSize="sm">
                계정에 로그인해 주세요
              </Text>
            </Stack>

            <form onSubmit={handleSubmit(onSubmit)}>
              <Stack gap={4}>
                <Stack gap={1.5}>
                  <Text fontSize="sm" fontWeight="medium" color="gray.700">
                    이메일
                  </Text>
                  <Input
                    {...register("email", {
                      required: "이메일을 입력해주세요",
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: "올바른 이메일을 입력해주세요",
                      },
                    })}
                    placeholder="name@company.com"
                    type="email"
                    size="md"
                    borderColor={errors.email ? "red.300" : "gray.200"}
                  />
                  {errors.email && (
                    <Text color="red.500" fontSize="xs">
                      {errors.email.message}
                    </Text>
                  )}
                </Stack>

                <Stack gap={1.5}>
                  <Text fontSize="sm" fontWeight="medium" color="gray.700">
                    비밀번호
                  </Text>
                  <Box position="relative">
                    <Input
                      {...register("password", {
                        required: "비밀번호를 입력해주세요",
                      })}
                      placeholder="비밀번호 입력"
                      type={showPassword ? "text" : "password"}
                      size="md"
                      pr={10}
                      borderColor={errors.password ? "red.300" : "gray.200"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      style={{
                        position: "absolute",
                        right: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                        lineHeight: 0,
                        color: "inherit",
                      }}
                    >
                      <Icon as={showPassword ? EyeOff : Eye} boxSize={4} color="gray.400" />
                    </button>
                  </Box>
                  {errors.password && (
                    <Text color="red.500" fontSize="xs">
                      {errors.password.message}
                    </Text>
                  )}
                </Stack>

                <Button
                  type="submit"
                  colorPalette="blue"
                  loading={isSubmitting}
                  loadingText="로그인 중..."
                  w="full"
                  mt={1}
                  size="md"
                  fontWeight="semibold"
                >
                  로그인
                </Button>
              </Stack>
            </form>

            <Flex align="center" gap={3}>
              <Box flex="1" h="1px" bg="gray.100" />
              <Text fontSize="xs" color="gray.400">또는</Text>
              <Box flex="1" h="1px" bg="gray.100" />
            </Flex>

            <Text fontSize="sm" color="gray.500" textAlign="center">
              계정이 없으신가요?{" "}
              <Text
                as="span"
                color="blue.500"
                fontWeight="medium"
                _hover={{ textDecoration: "underline" }}
              >
                <Link href="/signup">회원가입</Link>
              </Text>
            </Text>
          </Stack>
        </Box>
      </Box>
    </Flex>
  );
}
